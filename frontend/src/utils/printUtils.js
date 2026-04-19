import axios from 'axios';

const numberToWords = (num) => {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const scales = ['','Thousand','Lakh','Crore'];
  if (num === 0) return 'Zero';
  const convert = (n, scale) => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n/10)] + ' ' + ones[n%10] + ' ';
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred ' + (n%100 ? 'and ' + convert(n%100, '') : '');
    return '';
  };
  let result = '';
  let scaleIndex = 0;
  while (num > 0) {
    let chunk;
    if (scaleIndex === 0) { chunk = num % 1000; num = Math.floor(num / 1000); } 
    else { chunk = num % 100; num = Math.floor(num / 100); }
    if (chunk > 0) result = convert(chunk, scales[scaleIndex]) + scales[scaleIndex] + ' ' + result;
    scaleIndex++;
  }
  return result.trim();
};

export const printTransaction = async (API, token, item) => {
  if (item.type !== 'SALE') {
    alert('Return specific printing is coming soon.');
    return;
  }

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to print invoices');
    return;
  }

  try {
    win.document.write('<html><body style="font-family:Arial,sans-serif;padding:50px;text-align:center;"><h2>Loading invoice...</h2></body></html>');
    
    const getConfig = () => ({ headers: { Authorization: `Bearer ${token}` } });
    const realId = item.rawId;

    const [saleRes, setRes] = await Promise.all([
      axios.get(`${API}/sales/${realId}`, getConfig()),
      axios.get(`${API}/settings`, getConfig()).catch(() => ({ data: { data: {} } }))
    ]);

    const fullTx = saleRes.data.data;
    const items = fullTx.products || fullTx.items || [];
    const bs = setRes.data.data?.business || {};
    const inv = setRes.data.data?.invoice || {};

    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalAmount = 0;
    
    let rowsHtml = '';
    let sno = 1;
    for (const p of items) {
      const taxable = Number(p.TAXABLE_AMOUNT || p.taxable_amount || (p.unit_price * p.quantity) || 0);
      const gstRate = Number(p.GST_RATE || p.gst_rate || 0);
      const cgst = Number(p.CGST_AMOUNT || p.cgst_amount || (taxable * gstRate / 200));
      const sgst = Number(p.SGST_AMOUNT || p.sgst_amount || (taxable * gstRate / 200));
      const igst = Number(p.IGST_AMOUNT || p.igst_amount || 0);
      const total = Number(p.TOTAL_AMOUNT || p.total_amount || (taxable + cgst + sgst + igst));
      
      totalTaxable += taxable; totalCGST += cgst; totalSGST += sgst; totalIGST += igst; totalAmount += total;
      
      rowsHtml += `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${sno++}</td>
          <td style="padding:8px;border:1px solid #ddd">${p.PRODUCT_NAME || p.product_name || '-'}</td>
          ${inv.showHSN !== false ? `<td style="padding:8px;border:1px solid #ddd;text-align:center">${p.HSN_CODE || p.hsn_code || '-'}</td>` : ''}
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${p.QUANTITY || p.quantity}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${Number(p.UNIT_PRICE || p.unit_price || 0).toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${taxable.toFixed(2)}</td>
          ${inv.showGSTBreakup !== false ? `<td style="padding:8px;border:1px solid #ddd;text-align:center">${gstRate}%</td>` : ''}
          ${inv.showGSTBreakup !== false ? (totalIGST > 0 ? `<td style="padding:8px;border:1px solid #ddd;text-align:right">₹${igst.toFixed(2)}</td>` : `
            <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${cgst.toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${sgst.toFixed(2)}</td>
          `) : ''}
          <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">₹${total.toFixed(2)}</td>
        </tr>`;
    }

    const discount = fullTx.DISCOUNT || fullTx.discount || 0;
    const grandTotal = totalAmount - discount;
    const isIGST = totalIGST > 0;
    const invoiceDate = new Date(fullTx.INVOICE_DATE || fullTx.invoice_date || fullTx.saleDate || new Date()).toLocaleDateString('en-IN');
    const customerName = fullTx.CUSTOMER_NAME || fullTx.customerName || fullTx.customer_name || 'Walk-in Customer';
    
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Tax Invoice - ${fullTx.INVOICE_NUMBER || fullTx.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; background: #fff; }
  .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 2px solid #1e40af; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #1e40af; margin-bottom: 20px; }
  .company-info h1 { color: #1e40af; font-size: 28px; font-weight: bold; margin-bottom: 5px; }
  .company-info .trade-name { color: #666; font-size: 14px; margin-bottom: 10px; }
  .company-info p { color: #555; font-size: 11px; line-height: 1.6; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { color: #1e40af; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
  .invoice-title .invoice-number { font-size: 14px; color: #666; font-weight: bold; }
  .gst-badge { background: #1e40af; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 8px; }
  .parties { display: flex; gap: 20px; margin-bottom: 20px; }
  .party-box { flex: 1; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .party-box h3 { color: #1e40af; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #1e40af; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
  th { background: #1e40af; color: white; padding: 10px 8px; text-align: center; border: 1px solid #1e40af; }
  td { padding: 8px; border: 1px solid #ddd; }
  .summary-section { display: flex; justify-content: flex-end; margin-top: 20px; }
  .summary-table { width: 350px; border-collapse: collapse; }
  .summary-table td { padding: 8px 12px; border: 1px solid #ddd; }
  .summary-table .label { background: #f8fafc; font-weight: 600; }
  .summary-table .value { text-align: right; font-family: monospace; }
  .summary-table .grand-total { background: #1e40af; color: white; font-size: 14px; font-weight: bold; }
  .amount-in-words { margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; }
  .terms { flex: 1; font-size: 10px; color: #666; }
  .signature { text-align: center; width: 200px; }
  .signature-line { border-top: 1px solid #333; margin-top: 35px; padding-top: 8px; font-weight: 600; }
  @media print { body { padding: 0; } .invoice-container { border: 2px solid #1e40af; } }
</style>
</head>
<body>
<div class="invoice-container">
  <div class="header">
    <div class="company-info">
      <h1>${bs.businessName || 'My Business'}</h1>
      ${bs.tradeName ? `<div class="trade-name">${bs.tradeName}</div>` : ''}
      <p>
        ${bs.address ? bs.address + '<br>' : ''}
        ${bs.gstin ? '<br><span class="gst-badge">GSTIN: ' + bs.gstin + '</span>' : ''}
      </p>
    </div>
    <div class="invoice-title"><h2>TAX INVOICE</h2><div class="invoice-number">${fullTx.INVOICE_NUMBER || fullTx.invoice_number}</div>
    <div style="margin-top:10px;font-size:11px;color:#666">Date: ${invoiceDate}</div></div>
  </div>

  <div class="parties">
    <div class="party-box" style="margin-right: 20px;">
      <h3>Bill To</h3><p><strong>${customerName}</strong></p>
    </div>
    <div style="flex: 1;"></div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>Description</th>
      ${inv.showHSN !== false ? '<th>HSN</th>' : ''}
      <th>Qty</th><th>Rate</th><th>Taxable</th>
      ${inv.showGSTBreakup !== false ? '<th>GST%</th>' : ''}
      ${inv.showGSTBreakup !== false ? (isIGST ? '<th>IGST</th>' : '<th>CGST</th><th>SGST</th>') : ''}
      <th>Total</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="summary-section">
    <table class="summary-table">
      <tr><td class="label">Sub Total</td><td class="value">₹${totalTaxable.toFixed(2)}</td></tr>
      ${isIGST ? `<tr><td class="label">IGST</td><td class="value">₹${totalIGST.toFixed(2)}</td></tr>` 
               : `<tr><td class="label">CGST</td><td class="value">₹${totalCGST.toFixed(2)}</td></tr><tr><td class="label">SGST</td><td class="value">₹${totalSGST.toFixed(2)}</td></tr>`}
      <tr class="grand-total"><td class="label">GRAND TOTAL</td><td class="value">₹${grandTotal.toFixed(2)}</td></tr>
    </table>
  </div>
  
  <div class="amount-in-words">
    <h4>Amount in Words:</h4><p>${numberToWords(Math.round(grandTotal))} Rupees Only</p>
  </div>

  <div class="footer">
    <div class="signature">
      <div class="signature-line">Authorized Signature</div>
    </div>
  </div>
</div>
<script>setTimeout(function(){ window.print(); }, 500);</script>
</body></html>`);
    win.document.close();
  } catch (err) {
    if (!win.closed) { win.document.open(); win.document.write('<pre style="color:red">'+err.stack+'</pre>'); win.document.close(); }
  }
};
