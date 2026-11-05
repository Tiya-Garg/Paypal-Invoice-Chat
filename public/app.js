// Client application logic
const q = new URLSearchParams(location.search);
const invoiceId = q.get('invoiceId') || q.get('i');
const role = q.get('role') || 'seller';

let state = null;
let previousRowSnapshots = {};
let ws = null;
let speechRecognizer = null;
let isRecording = false;

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function announce(text) {
  const el = document.getElementById('aria-announcer');
  if (el) el.textContent = text;
}

function formatMoney(minor, cur = 'USD') {
  const major = Number(minor || 0) / 100;
  return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: cur,
  }).format(major);
}

function connectRealtime() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${location.host}/ws?invoiceId=${invoiceId}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('Realtime WebSocket connected');
  };

  ws.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'state') {
        state = data;
        render();
      } else if (data.type === 'invoice_updated') {
        if (state) {
          state.invoice = data.invoice;
          announce(`Invoice updated to version ${data.version}. ${data.summaries.join(', ')}`);
          render();
        }
      } else if (data.type === 'new_message') {
        if (state) {
          state.messages.push(data.message);
          renderMessages();
          announce(`New message from ${data.message.authorRole}: ${data.message.body}`);
        }
      } else if (data.type === 'error') {
        alert(data.message);
      }
    } catch (e) {
      console.error('Error handling message', e);
    }
  };

  ws.onclose = () => {
    console.warn('Disconnected. Attempting reconnect in 3s...');
    setTimeout(connectRealtime, 3000);
  };
}

function sendWs(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognizer = new SpeechRecognition();
  recognizer.continuous = false;
  recognizer.interimResults = true;

  recognizer.onresult = event => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join('');
    const input = document.getElementById('chat-input');
    if (input) input.value = transcript;
  };

  recognizer.onend = () => {
    isRecording = false;
    updateMicButton();
  };

  return recognizer;
}

function toggleVoice() {
  if (!speechRecognizer) {
    alert('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
    return;
  }
  if (!isRecording) {
    speechRecognizer.start();
    isRecording = true;
  } else {
    speechRecognizer.stop();
    isRecording = false;
  }
  updateMicButton();
}

function updateMicButton() {
  const btn = document.getElementById('voice-btn');
  if (!btn) return;
  if (isRecording) {
    btn.classList.add('recording');
    btn.setAttribute('aria-label', 'Stop listening');
  } else {
    btn.classList.remove('recording');
    btn.setAttribute('aria-label', 'Push to talk');
  }
}

function render() {
  const app = document.getElementById('app');
  if (!state || !state.invoice) {
    app.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <h2>Invoice Thread</h2>
        <p style="color: var(--mut); margin-top: 8px;">The invoice has not been created or sent by the seller yet.</p>
      </div>`;
    return;
  }

  const inv = state.invoice;
  const isSeller = state.role === 'seller';
  const isLocked = ['PAID', 'CANCELLED', 'REFUNDED'].includes(inv.status);
  const canEdit = isSeller && !isLocked;

  // Calculate totals
  let subtotal = 0;
  inv.items.forEach(i => {
    subtotal += (Number(i.unitMinor) * Number(i.qtyMilli || 1000)) / 1000;
  });

  let discountAmt = 0;
  if (inv.discount) {
    discountAmt = inv.discount.kind === 'percent'
      ? (subtotal * Number(inv.discount.percentBps)) / 10000
      : Number(inv.discount.amountMinor);
  }
  const taxable = Math.max(0, subtotal - discountAmt);
  const taxAmt = inv.tax ? (taxable * Number(inv.tax.percentBps)) / 10000 : 0;
  const grandTotal = Math.max(0, subtotal - discountAmt + taxAmt);

  // Invoice Section
  const invoiceHtml = `
    <section class="card" aria-label="Invoice Details">
      <div class="invoice-header">
        <div>
          <h1 style="font-size: 22px; margin-bottom: 4px;">${escapeHtml(inv.number)} <span style="font-size: 14px; color: var(--mut); font-weight: normal;">v${inv.version}</span></h1>
          <div style="font-size: 13px; color: var(--mut);">
            Recipient: <b>${escapeHtml(inv.firmName || '(Not set)')}</b> &lt;${escapeHtml(inv.firmEmail || 'no email')}&gt;
            &middot; Due in ${inv.dueDays} days
          </div>
        </div>
        <div style="text-align: right;">
          <span class="status-badge ${inv.status.toLowerCase()}">${inv.status}</span>
          <span class="sync-badge ${inv.syncState}">${inv.syncState}</span>
        </div>
      </div>

      <table aria-label="Invoice Line Items">
        <thead>
          <tr>
            <th>Description</th>
            <th class="r" style="width: 80px;">Qty</th>
            <th class="r" style="width: 120px;">Unit Price</th>
            <th class="r" style="width: 120px;">Amount</th>
            ${canEdit ? '<th style="width: 40px;"></th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(item => {
            const itemKey = `${item.id}-${item.description}-${item.unitMinor}`;
            const isChanged = previousRowSnapshots[item.id] && previousRowSnapshots[item.id] !== itemKey;
            const lineTotal = (Number(item.unitMinor) * Number(item.qtyMilli || 1000)) / 1000;

            return `
              <tr class="${isChanged ? 'hl' : ''}">
                <td>
                  ${canEdit
                    ? `<input class="editable-input" data-id="${item.id}" data-field="description" value="${escapeHtml(item.description)}">`
                    : escapeHtml(item.description)}
                </td>
                <td class="r">
                  ${canEdit
                    ? `<input class="editable-input r" type="number" step="any" data-id="${item.id}" data-field="qty" value="${Number(item.qtyMilli || 1000) / 1000}">`
                    : Number(item.qtyMilli || 1000) / 1000}
                </td>
                <td class="r">
                  ${canEdit
                    ? `<input class="editable-input r" type="number" step="any" data-id="${item.id}" data-field="unitPrice" value="${Number(item.unitMinor) / 100}">`
                    : formatMoney(item.unitMinor, inv.currency)}
                </td>
                <td class="r" style="font-weight: 600;">${formatMoney(lineTotal, inv.currency)}</td>
                ${canEdit ? `<td class="r"><button class="btn secondary" data-remove="${item.id}" style="padding: 2px 6px; font-size: 11px;">✕</button></td>` : ''}
              </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${formatMoney(subtotal, inv.currency)}</span></div>
        ${inv.discount ? `<div class="totals-row" style="color: var(--ok);"><span>Discount</span><span>−${formatMoney(discountAmt, inv.currency)}</span></div>` : ''}
        ${inv.tax ? `<div class="totals-row"><span>${escapeHtml(inv.tax.name)} (${Number(inv.tax.percentBps) / 100}%)</span><span>${formatMoney(taxAmt, inv.currency)}</span></div>` : ''}
        <div class="totals-row grand"><span>Total Due</span><span>${formatMoney(grandTotal, inv.currency)}</span></div>
      </div>

      <div class="actions-bar">
        ${isSeller && inv.status === 'DRAFT' ? '<button class="btn" id="btn-send-modal">Review & Send from PayPal</button>' : ''}
        ${!isSeller && inv.status === 'SENT' ? '<button class="btn secondary" id="btn-firm-approve">Approve Invoice</button>' : ''}
        ${!isSeller && inv.recipientViewUrl ? `<a href="${inv.recipientViewUrl}" target="_blank" rel="noopener noreferrer" class="btn pay-paypal">Pay on PayPal</a>` : ''}
        ${isSeller ? '<button class="btn secondary" id="btn-copy-invite">Copy Firm Invite Link</button>' : ''}
      </div>

      ${state.versions && state.versions.length ? `
        <div class="version-drawer">
          <b>Version History:</b>
          ${state.versions.slice(-3).map(v => `v${v.version} (${v.actor}): ${escapeHtml(v.summary.join(', '))}`).join(' &rarr; ')}
        </div>` : ''}
    </section>
  `;

  // Chat Section
  const chatHtml = `
    <section class="card chat-panel" aria-label="Invoice Conversation Thread">
      <div class="messages-list" id="messages-list"></div>

      <div class="example-chips" aria-label="Example Prompts">
        <button class="chip" data-prompt="@PayPal add 3k for installation service">+ Installation (3k)</button>
        <button class="chip" data-prompt="@PayPal add 18% GST">+ 18% GST</button>
        <button class="chip" data-prompt="@PayPal remove material">+ Remove</button>
      </div>

      <div class="chat-input-bar">
        <button class="voice-btn" id="voice-btn" title="Push to talk" aria-label="Push to talk">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>
        <input type="text" id="chat-input" class="chat-input" placeholder="Type @PayPal to propose or make changes..." autocomplete="off">
        <button class="btn" id="btn-send-chat">Send</button>
      </div>
    </section>
  `;

  app.innerHTML = invoiceHtml + chatHtml;

  // Snapshot current row keys for highlight detection on next update
  previousRowSnapshots = {};
  inv.items.forEach(i => {
    previousRowSnapshots[i.id] = `${i.id}-${i.description}-${i.unitMinor}`;
  });

  renderMessages();
  attachEvents();
}

function renderMessages() {
  const container = document.getElementById('messages-list');
  if (!container || !state) return;

  container.innerHTML = state.messages.map(m => {
    const isSeller = state.role === 'seller';
    const authorClass = m.authorRole === 'pp' ? 'author-pp' : m.authorRole === 'seller' ? 'author-seller' : 'author-firm';
    const authorName = m.authorRole === 'pp' ? 'PayPal Assistant' : m.authorRole === 'seller' ? 'Seller' : 'Firm';

    return `
      <div class="msg ${authorClass}">
        <div class="msg-meta">
          <span>${authorName}</span>
          <span>${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div>${escapeHtml(m.body)}</div>
        ${m.proposal ? `
          <div class="proposal-card">
            <div style="font-size: 12px; margin-bottom: 6px; font-weight: 600;">Proposed Change (${m.proposal.state})</div>
            ${m.proposal.state === 'open' && isSeller ? `
              <div style="display: flex; gap: 8px;">
                <button class="btn" data-proposal-accept="${m.proposal.id}" style="padding: 4px 10px; font-size: 12px;">Approve</button>
                <button class="btn decl" data-proposal-decline="${m.proposal.id}" style="padding: 4px 10px; font-size: 12px;">Decline</button>
              </div>` : ''}
          </div>` : ''}
      </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function attachEvents() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send-chat');

  const submitChat = () => {
    const text = chatInput.value.trim();
    if (!text) return;
    sendWs({ type: 'chat', text, idempotencyKey: Math.random().toString(36).slice(2) });
    chatInput.value = '';
  };

  if (sendBtn) sendBtn.onclick = submitChat;
  if (chatInput) {
    chatInput.onkeydown = e => {
      if (e.key === 'Enter') submitChat();
    };
  }

  // Voice push to talk
  const voiceBtn = document.getElementById('voice-btn');
  if (voiceBtn) voiceBtn.onclick = toggleVoice;

  // Example chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.onclick = () => {
      if (chatInput) {
        chatInput.value = chip.getAttribute('data-prompt') || '';
        chatInput.focus();
      }
    };
  });

  // Edit item inline
  document.querySelectorAll('.editable-input').forEach(input => {
    input.onchange = e => {
      const el = e.target;
      const itemId = el.getAttribute('data-id');
      const field = el.getAttribute('data-field');
      const val = el.value;

      sendWs({
        type: 'edit_item',
        id: itemId,
        [field]: field === 'qty' || field === 'unitPrice' ? Number(val) : val,
      });
    };
  });

  // Remove item
  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-remove');
      sendWs({ type: 'remove_item', id });
    };
  });

  // Proposal decisions
  document.querySelectorAll('[data-proposal-accept]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-proposal-accept');
      sendWs({ type: 'decide_proposal', proposalId: id, accept: true });
    };
  });
  document.querySelectorAll('[data-proposal-decline]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-proposal-decline');
      sendWs({ type: 'decide_proposal', proposalId: id, accept: false });
    };
  });

  // Copy invite link
  const copyBtn = document.getElementById('btn-copy-invite');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const inviteUrl = `${location.origin}?invoiceId=${invoiceId}&role=firm`;
      navigator.clipboard.writeText(inviteUrl);
      alert('Firm invite link copied to clipboard!');
    };
  }

  // Send modal
  const sendModalBtn = document.getElementById('btn-send-modal');
  if (sendModalBtn) {
    sendModalBtn.onclick = () => {
      if (confirm(`Send invoice ${state.invoice.number} to ${state.invoice.firmEmail} through PayPal?`)) {
        sendWs({ type: 'send_invoice' });
      }
    };
  }
}

// Boot client
if (invoiceId) {
  connectRealtime();
  speechRecognizer = initSpeechRecognition();
} else {
  document.getElementById('app').innerHTML = `
    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
      <h2>Invoice Chat</h2>
      <p style="color: var(--mut); margin: 12px 0;">Create a thread to begin quoting invoices live with your clients.</p>
      <button class="btn" onclick="location.href='/?invoiceId=INV-' + Math.floor(Math.random()*9000 + 1000)">Create Invoice Thread</button>
    </div>`;
}
