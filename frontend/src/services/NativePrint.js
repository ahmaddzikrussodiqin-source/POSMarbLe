// Native Print Service - Uses Android's native PrintDocumentAdapter
// This bridges JavaScript to native Android Print functionality

const NativePrint = {
  // Check if running in native Android
  isAndroid: () => {
    return typeof window.android !== 'undefined' || 
           (navigator.userAgent && navigator.userAgent.includes('Android'));
  },

  // Print using native Android PrintService
  print: (htmlContent, title = 'Nota') => {
    return new Promise((resolve, reject) => {
      // Method 1: If Android bridge exists
      if (window.AndroidPrint && typeof window.AndroidPrint.printHTML === 'function') {
        window.AndroidPrint.printHTML(htmlContent, title);
        resolve(true);
        return;
      }
      
      // Method 2: Use web API as fallback
      try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          reject(new Error('Popup blocked'));
          return;
        }
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.print();
              resolve(true);
            } catch (e) {
              reject(e);
            }
          }, 300);
        };
      } catch (error) {
        reject(error);
      }
    });
  },

  // Generate print HTML
  generatePrintHTML: (data) => {
    const { notaSettings, showReceipt, calculateTax } = data;
    const totalWithTax = notaSettings.tax_rate > 0 
      ? showReceipt.total_amount + calculateTax(showReceipt.total_amount, notaSettings.tax_rate)
      : showReceipt.total_amount;
    
    const itemsHtml = showReceipt.items.map(item => `
      <tr>
        <td style="padding: 4px 0;">
          <div style="font-weight: 500;">${item.product_name}</div>
          <div style="color: #6b7280; font-size: 12px;">x${item.quantity}</div>
        </td>
        <td style="text-align: right; padding: 4px 0;">${formatCurrency(item.subtotal, notaSettings.currency)}</td>
      </tr>
    `).join('');

    const taxHtml = notaSettings.tax_rate > 0 ? `
      <tr>
        <td style="padding: 4px 0; color: #6b7280;">Pajak (${notaSettings.tax_rate}%)</td>
        <td style="text-align: right; padding: 4px 0;">${formatCurrency(calculateTax(showReceipt.total_amount, notaSettings.tax_rate), notaSettings.currency)}</td>
      </tr>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Nota - ${showReceipt.order_number}</title>
        <style>
          @page { margin: 0; size: 58mm auto; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 58mm;
            margin: 0;
            padding: 2mm;
            font-size: 11px;
            color: #000;
          }
          .header { text-align: center; padding-bottom: 8px; border-bottom: 1px dashed #000; margin-bottom: 8px; }
          .shop-name { font-size: 14px; font-weight: bold; }
          .order-number { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000; }
          .order-number-value { font-size: 16px; font-weight: bold; color: #000; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .total-row { font-weight: bold; font-size: 12px; border-top: 1px dashed #000; }
          .payment-method { background: #eee; padding: 6px; text-align: center; margin-top: 8px; font-size: 10px; }
          .footer { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000; font-size: 10px; }
          .print-btn { display: none; }
          @media print {
            body { width: 58mm !important; }
            .print-btn { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 24px; margin-bottom: 5px;">${notaSettings.logo ? '<img src="' + notaSettings.logo + '" style="height: 25px;" />' : '🏪'}</div>
          <div class="shop-name">${notaSettings.shop_name || 'Toko'}</div>
          ${notaSettings.address ? `<div style="font-size: 9px;">${notaSettings.address}</div>` : ''}
          ${notaSettings.phone ? `<div style="font-size: 9px;">Telp: ${notaSettings.phone}</div>` : ''}
          <div class="order-number">
            <div style="font-size: 9px; color: #666;">Nomor Pesanan</div>
            <div class="order-number-value">${showReceipt.order_number}</div>
        </div>
        <table>
          ${itemsHtml}
          <tr><td colspan="2" style="border-top: 1px dashed #ccc; padding-top: 4px;"></td></tr>
          <tr>
            <td style="padding: 4px 0;">Subtotal</td>
            <td style="text-align: right;">${formatCurrency(showReceipt.total_amount, notaSettings.currency)}</td>
          </tr>
          ${taxHtml}
          <tr class="total-row">
            <td style="padding: 6px 0;">TOTAL</td>
            <td style="text-align: right;">${formatCurrency(totalWithTax, notaSettings.currency)}</td>
          </tr>
        </table>
        <div class="payment-method">
          <strong>${showReceipt.payment_method === 'cash' ? 'Tunai' : showReceipt.payment_method === 'qris' ? 'QRIS' : 'Kartu Debit'}</strong>
        </div>
        <div class="footer">
          <strong>${notaSettings.shop_name || 'Toko'}</strong><br>
          ${notaSettings.footer_text || 'Terima kasih!'}
        </div>
        <button class="print-btn" onclick="window.print()" style="display:none;">Print</button>
        <script>
          function formatCurrency(amount, currency) {
            return 'Rp' + new Intl.NumberFormat('id-ID').format(amount);
          }
          window.onload = function() {
            setTimeout(function() { 
              try { window.print(); } catch(e) {} 
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
  }
};

// Helper function
function formatCurrency(amount, currency = 'IDR') {
  return 'Rp' + new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export default NativePrint;
