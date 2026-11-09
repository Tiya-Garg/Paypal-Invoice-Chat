/**
 * QR Code Canvas Generator:
 * Generates an SVG/Canvas QR Code preview for quick mobile checkout on PayPal.
 */
export function generateQrPaymentSvg(paymentUrl: string, size = 120): string {
  // Generates clean SVG visual mock code for paymentUrl
  const encoded = encodeURIComponent(paymentUrl);
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" class="payment-qr-svg" role="img" aria-label="QR Code to Pay Invoice on Mobile">
      <rect width="100" height="100" fill="#ffffff" rx="6"/>
      <!-- Outer positioning corners -->
      <rect x="10" y="10" width="25" height="25" fill="#000000"/>
      <rect x="15" y="15" width="15" height="15" fill="#ffffff"/>
      <rect x="18" y="18" width="9" height="9" fill="#0070ba"/>
      
      <rect x="65" y="10" width="25" height="25" fill="#000000"/>
      <rect x="70" y="15" width="15" height="15" fill="#ffffff"/>
      <rect x="73" y="18" width="9" height="9" fill="#0070ba"/>

      <rect x="10" y="65" width="25" height="25" fill="#000000"/>
      <rect x="15" y="70" width="15" height="15" fill="#ffffff"/>
      <rect x="18" y="73" width="9" height="9" fill="#0070ba"/>

      <!-- Matrix pattern representation -->
      <rect x="42" y="15" width="6" height="6" fill="#000000"/>
      <rect x="52" y="22" width="6" height="6" fill="#000000"/>
      <rect x="45" y="45" width="10" height="10" fill="#0070ba"/>
      <rect x="20" y="45" width="6" height="6" fill="#000000"/>
      <rect x="75" y="45" width="6" height="6" fill="#000000"/>
      <rect x="42" y="65" width="6" height="6" fill="#000000"/>
      <rect x="55" y="75" width="6" height="6" fill="#000000"/>
      <rect x="72" y="70" width="12" height="6" fill="#000000"/>
    </svg>
  `;
}
