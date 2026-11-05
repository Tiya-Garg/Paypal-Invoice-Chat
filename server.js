import express from 'express';import http from 'http';import {WebSocketServer} from 'ws';import {randomUUID as uid} from 'crypto';
const {ANTHROPIC_API_KEY,PAYPAL_CLIENT_ID,PAYPAL_SECRET,MODEL='claude-sonnet-4-6',PORT=3000}=process.env;
const LIVE=!!PAYPAL_CLIENT_ID,PP=process.env.PAYPAL_BASE||'https://api-m.sandbox.paypal.com';
const db=new Map(); // swap for Postgres: rooms = invoices + messages + history
const app=express();app.use(express.json());app.use(express.static('public'));

/* ---------- invoice domain ---------- */
const fmt=(inv,n)=>new Intl.NumberFormat(inv.cur==='INR'?'en-IN':'en-US',{style:'currency',currency:inv.cur}).format(n);
const totals=inv=>{const sub=inv.items.reduce((s,i)=>s+i.amt,0),d=inv.disc?(inv.disc.t==='pct'?sub*inv.disc.v/100:inv.disc.v):0,tx=inv.tax?(sub-d)*inv.tax.r/100:0;return{sub,d,tx,total:sub-d+tx}};
const money=n=>{if(!(n>0)||!isFinite(n))throw Error('Amount must be a positive number');return Math.round(n*100)/100};
const find=(inv,q)=>{const x=inv.items.find(i=>i.id===q)||inv.items.find(i=>i.desc.toLowerCase().includes(String(q||'').toLowerCase()));if(!x)throw Error(`No item matching “${q}”`);return x};
function apply(inv,ops){return ops.map(o=>{switch(o.op){
 case'set_firm':if(o.firm)inv.firm=o.firm;if(o.email)inv.email=o.email;return`Bill to ${inv.firm}${inv.email?' <'+inv.email+'>':''}`;
 case'add_item':{const it={id:uid().slice(0,6),desc:o.description,amt:money(o.amount)};inv.items.push(it);return`Added ${it.desc} (${fmt(inv,it.amt)})`}
 case'update_item':{const it=find(inv,o.match);if(o.amount)it.amt=money(o.amount);if(o.description)it.desc=o.description;return`${it.desc} is now ${fmt(inv,it.amt)}`}
 case'remove_item':{const it=find(inv,o.match);inv.items=inv.items.filter(x=>x!==it);return`Removed ${it.desc}`}
 case'set_tax':inv.tax=o.percent?{r:o.percent,n:o.label||'Tax'}:null;return inv.tax?`${inv.tax.n} ${o.percent}%`:'Tax removed';
 case'set_discount':inv.disc=o.percent?{t:'pct',v:o.percent}:o.amount?{t:'flat',v:money(o.amount)}:null;return inv.disc?'Discount applied':'Discount removed';
 case'set_due_days':inv.due=o.days;return`Due in ${o.days} days`;
 default:throw Error('Unsupported edit: '+o.op)}})}

/* ---------- LLM: chat text -> structured ops ---------- */
const TOOL={name:'edit_invoice',description:'Structured edits to the invoice',input_schema:{type:'object',required:['ops'],properties:{say:{type:'string'},ops:{type:'array',items:{type:'object',required:['op'],properties:{op:{type:'string',enum:['set_firm','add_item','update_item','remove_item','set_tax','set_discount','set_due_days']},firm:{type:'string'},email:{type:'string'},description:{type:'string'},amount:{type:'number'},match:{type:'string'},percent:{type:'number'},label:{type:'string'},days:{type:'number'}}}}}}};
async function parse(text,inv){
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:MODEL,max_tokens:800,tool_choice:{type:'tool',name:'edit_invoice'},tools:[TOOL],
  system:`Convert the user's chat command into invoice edit ops. Amounts are major units of ${inv.cur}: "5k"=5000, "1.5L" or "1.5 lakh"=150000. Quote/create requests = set_firm + add_item ops. Use "match" with an existing item description or id. If the request is ambiguous or not an invoice edit, return no ops and a short question in "say". Current invoice: ${JSON.stringify(inv)}`,messages:[{role:'user',content:text}]})});
 const j=await r.json(),u=j.content?.find(c=>c.type==='tool_use');if(!u)throw Error(j.error?.message||'Could not parse that');return u.input}

/* ---------- PayPal Invoicing v2 (verify field names against your sandbox) ---------- */
let tk={t:'',exp:0};
async function ppFetch(path,method='GET',body){
 if(Date.now()>tk.exp){const r=await fetch(PP+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(PAYPAL_CLIENT_ID+':'+PAYPAL_SECRET).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'}).then(r=>r.json());tk={t:r.access_token,exp:Date.now()+(r.expires_in-60)*1000}}
 const r=await fetch(PP+path,{method,headers:{Authorization:'Bearer '+tk.t,'Content-Type':'application/json'},body:body&&JSON.stringify(body)}),txt=await r.text();
 if(!r.ok)throw Error('PayPal: '+txt.slice(0,300));return txt?JSON.parse(txt):null}
const ppBody=inv=>{const c=inv.cur,v=n=>({currency_code:c,value:n.toFixed(2)}),due=new Date(Date.now()+inv.due*864e5).toISOString().slice(0,10);
 return{detail:{currency_code:c,invoice_number:inv.no,payment_term:{term_type:'DUE_ON_DATE_SPECIFIED',due_date:due}},
  primary_recipients:[{billing_info:{business_name:inv.firm,email_address:inv.email}}],
  items:inv.items.map(i=>({name:i.desc,quantity:'1',unit_amount:v(i.amt),...(inv.tax&&{tax:{name:inv.tax.n,percent:String(inv.tax.r)}})})),
  ...(inv.disc&&{amount:{breakdown:{discount:{invoice_discount:inv.disc.t==='pct'?{percent:String(inv.disc.v)}:{amount:v(inv.disc.v)}}}}})}};
async function ppSend(inv){
 if(!inv.pp){const c=await ppFetch('/v2/invoicing/invoices','POST',ppBody(inv));inv.pp=c.href.split('/').pop();
  await ppFetch(`/v2/invoicing/invoices/${inv.pp}/send`,'POST',{send_to_recipient:true,send_to_invoicer:false})}
 else await ppFetch(`/v2/invoicing/invoices/${inv.pp}?send_to_recipient=true`,'PUT',ppBody(inv))}
app.post('/webhooks/paypal',(req,res)=>{ // TODO: verify signature via /v1/notifications/verify-webhook-signature
 if(req.body.event_type==='INVOICING.INVOICE.PAID'){const id=req.body.resource?.invoice?.id;for(const r of db.values())if(r.inv.pp===id){r.inv.status='paid';r.msgs.push({id:uid(),who:'pp',text:'Payment received via PayPal. Invoice closed.'});push(r)}}
 res.sendStatus(200)});

/* ---------- rooms ---------- */
app.post('/api/invoices',(req,res)=>{const id=uid(),s=uid(),f=uid();
 db.set(id,{id,firmTok:f,tok:{[s]:'seller',[f]:'firm'},socks:new Map(),msgs:[{id:uid(),who:'pp',pre:true,text:'Hi, I’m PayPal. Try: “Hey PayPal, quote 5k for material A and 8k for material B to Firm X (ap@firmx.com)”.'}],hist:[],
  inv:{no:'INV-'+String(db.size+1).padStart(4,'0'),firm:'',email:'',cur:req.body.cur==='INR'?'INR':'USD',items:[],tax:null,disc:null,due:15,status:'none',ver:0,pp:null}});
 res.json({seller:`/?i=${id}&t=${s}`})});
const pre=inv=>['none','draft'].includes(inv.status);
const state=(r,role)=>({role,live:LIVE,inv:role==='firm'&&pre(r.inv)?null:r.inv,msgs:r.msgs.filter(m=>role==='seller'||!m.pre),hist:r.hist.map(({v,by,s})=>({v,by,s})),firmLink:role==='seller'?`/?i=${r.id}&t=${r.firmTok}`:undefined});
function push(r){for(const [ws,role] of r.socks)ws.send(JSON.stringify(state(r,role)))}
function commit(r,by,ops){ // atomic: all ops apply or none; versioned + audited
 const c=structuredClone(r.inv),s=apply(c,ops);Object.assign(r.inv,c);const inv=r.inv;
 if(inv.status==='none'&&inv.items.length){inv.status='draft';inv.ver=1}
 else if(['sent','approved'].includes(inv.status)){inv.ver++;inv.status='sent'}
 r.hist.push({v:inv.ver,by,s,snap:structuredClone(inv)});
 if(LIVE&&inv.pp&&inv.status==='sent')ppSend(inv).catch(e=>{r.msgs.push({id:uid(),who:'pp',text:'PayPal sync failed: '+e.message});push(r)});
 return s}
async function onMsg(r,role,m){const inv=r.inv,say=(text,x={})=>r.msgs.push({id:uid(),who:'pp',pre:pre(inv),text,...x});
 try{switch(m.type){
  case'chat':{const text=String(m.text||'').slice(0,500);r.msgs.push({id:uid(),who:role,pre:pre(inv),text});
   if(!/@paypal|^\s*hey\s+paypal/i.test(text))break;
   if(inv.status==='paid')return say('This invoice is paid and locked.');
   const p=await parse(text.replace(/^\s*hey\s+paypal[,:]?\s*/i,'').replace(/@paypal[,:]?/ig,''),inv);
   if(!p.ops?.length)return say(p.say||'I couldn’t turn that into an edit.');
   if(role==='firm'){apply(structuredClone(inv),p.ops);return say('Sent to the seller for approval: '+(p.say||'requested change'),{prop:{ops:p.ops,state:'open'}})}
   if(!inv.items.length&&!p.ops.some(o=>o.op==='add_item'))return say('No invoice yet. Tell me what to quote.');
   say(commit(r,'seller',p.ops).join('. ')+`. Total ${fmt(inv,totals(inv).total)}.`);break}
  case'edit':if(role!=='seller')break;commit(r,'seller',[{op:'update_item',match:m.id,amount:m.amount,description:m.description}]);break;
  case'remove':if(role!=='seller')break;commit(r,'seller',[{op:'remove_item',match:m.id}]);break;
  case'send':if(role!=='seller'||inv.status!=='draft')break;
   if(LIVE){if(!inv.email)throw Error('Add the firm’s email first: “@PayPal email is ap@firmx.com”');await ppSend(inv)}
   inv.status='sent';say(`${inv.no} v${inv.ver} sent to ${inv.firm} from PayPal. They can reply here and tag @PayPal.`,{pre:false});break;
  case'approve':if(role==='firm'&&inv.status==='sent'){inv.status='approved';say(`${inv.firm} approved v${inv.ver}.`)}break;
  case'pay':if(role!=='firm'||!['sent','approved'].includes(inv.status))break;
   if(LIVE)throw Error('Pay from the PayPal invoice email; a webhook will mark this paid.');
   inv.status='paid';say('Payment received. Invoice closed.');break;
  case'decide':{if(role!=='seller')break;const x=r.msgs.find(q=>q.id===m.id&&q.prop?.state==='open');if(!x)break;
   if(m.accept){x.prop.state='done';say('Approved. '+commit(r,'firm→seller',x.prop.ops).join('. ')+`. Total ${fmt(inv,totals(inv).total)}.`)}
   else{x.prop.state='no';say('Change declined. Invoice unchanged.')}}}
 }catch(e){say(e.message)}}
const srv=http.createServer(app),wss=new WebSocketServer({server:srv,path:'/ws'});
wss.on('connection',(ws,req)=>{const q=new URL(req.url,'http://x').searchParams,r=db.get(q.get('i')),role=r?.tok[q.get('t')];if(!role)return ws.close();
 r.socks.set(ws,role);ws.on('close',()=>r.socks.delete(ws));
 ws.on('message',async d=>{try{await onMsg(r,role,JSON.parse(d))}catch{}push(r)});push(r)});
srv.listen(PORT,()=>console.log(`http://localhost:${PORT}  (${LIVE?'PayPal LIVE/sandbox':'MOCK payments'})`));
