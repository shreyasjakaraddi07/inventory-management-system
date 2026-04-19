import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, Printer, Save, TrendingUp, CheckCircle, Tag, RotateCcw,
  Search, User, AlertCircle, Loader2, FileText, ArrowLeft, Package, ChevronDown
} from 'lucide-react';
import Autocomplete from '../components/Autocomplete';

const API = 'http://localhost:8080/api';
const defaultLine = () => ({ product: '', productName: '', hsnCode: '', quantity: 1, unitPrice: 0, gstRate: 18 });

// ─── Status badge helper ────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    ACTIVE:             'bg-green-100 text-green-700 border-green-200',
    PARTIALLY_RETURNED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    FULLY_RETURNED:     'bg-red-100 text-red-700 border-red-200',
  };
  const label = { ACTIVE: 'Active', PARTIALLY_RETURNED: 'Part. Returned', FULLY_RETURNED: 'Fully Returned' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${map[status] || map.ACTIVE}`}>
      {label[status] || status || 'ACTIVE'}
    </span>
  );
};

const Sales = () => {
  // ── Sale form state ────────────────────────────────────────────────────────
  const [products, setProducts]       = useState([]);
  const [lines, setLines]             = useState([defaultLine()]);
  const [partyName, setPartyName]     = useState('');
  const [partyPhone, setPartyPhone]   = useState('');
  const [partyGSTIN, setPartyGSTIN]   = useState('');
  const [partyEmail, setPartyEmail]   = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isIGST, setIsIGST]           = useState(false);
  const [discount, setDiscount]       = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [savedTx, setSavedTx]         = useState(null);

  // ── Return form state ──────────────────────────────────────────────────────
  const [returnInvoiceRef, setReturnInvoiceRef]   = useState('');
  const [returnInvoiceData, setReturnInvoiceData] = useState(null); // from lookup
  const [returnItems, setReturnItems]             = useState([]);   // {product_id, qty_returnable, return_qty}
  const [returnNotes, setReturnNotes]             = useState('');
  const [returnDate, setReturnDate]               = useState(new Date().toISOString().split('T')[0]);
  const [returnLookupLoading, setReturnLookupLoading] = useState(false);
  const [returnLookupError, setReturnLookupError]     = useState('');
  const [savedReturn, setSavedReturn]             = useState(null);

  // ── Shared state ───────────────────────────────────────────────────────────
  const [history, setHistory]                     = useState([]);
  const [view, setView]                           = useState('form');   // 'form' | 'return' | 'history'
  const [orderType, setOrderType]                 = useState('SALE');
  const [customerStatus, setCustomerStatus]       = useState('idle');
  const [user, setUser]                           = useState(null);
  const [businessSettings, setBusinessSettings] = useState({
    businessName: 'My Business',
    tradeName: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: ''
  });
  const [invoiceSettings, setInvoiceSettings] = useState({});

  const getConfig = useCallback(() => {
    const u = JSON.parse(localStorage.getItem('userInfo'));
    return { headers: { Authorization: `Bearer ${u?.token || ''}` } };
  }, []);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('userInfo'));
    setUser(u);
  }, []);

  // Load business and invoice settings for invoice printing
  const loadBusinessSettings = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await axios.get(`${API}/settings`, getConfig());
      if (res.data?.business) {
        setBusinessSettings(prev => ({
          ...prev,
          ...res.data.business
        }));
      }
      if (res.data?.invoice) {
        setInvoiceSettings(res.data.invoice);
      }
    } catch { /* silent - use defaults */ }
  }, [getConfig, user]);

  useEffect(() => {
    loadBusinessSettings();
  }, [loadBusinessSettings]);

  const fetchHistory = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await axios.get(`${API}/sales`, getConfig());
      setHistory(res.data.data || []);
    } catch { /* silent */ }
  }, [getConfig, user]);

  const fetchProducts = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await axios.get(`${API}/products`, getConfig());
      setProducts(res.data.data || []);
    } catch { /* silent */ }
  }, [getConfig, user]);

  useEffect(() => {
    fetchHistory();
    fetchProducts();
  }, [fetchHistory, fetchProducts]);

  // ── Customer search (sale form) ────────────────────────────────────────────
  const selectCustomer = (cust) => {
    // Handle both uppercase (API) and lowercase field names
    const name = cust.CUSTOMER_NAME || cust.customer_name;
    const phone = cust.CUSTOMER_PHONE || cust.customer_phone;
    const gst = cust.CUSTOMER_GST || cust.customer_gst;
    const email = cust.CUSTOMER_EMAIL || cust.customer_email;
    
    if (cust.isNew) {
      setPartyName(name);
      setPartyPhone('');
      setPartyGSTIN('');
      setPartyEmail('');
      setCustomerStatus('idle');
    } else {
      setPartyName(name);
      setPartyPhone(phone || '');
      setPartyGSTIN(gst || '');
      setPartyEmail(email || '');
      setCustomerStatus('known');
    }
  };

  // ── Product line helpers (sale form) ──────────────────────────────────────
  const handleProductInputChange = (index, value) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], productName: value, product: '' };
    setLines(updated);
  };

  const handleSelectProduct = (idx, dbProd) => {
    const updated = [...lines];
    updated[idx] = {
      ...updated[idx],
      product: dbProd.PRODUCT_ID || dbProd.product_id,
      productName: dbProd.PRODUCT_NAME || dbProd.product_name || 'Unknown',
      hsnCode: dbProd.HSN_CODE || dbProd.hsn_code || '',
      unitPrice: dbProd.SALE_PRICE || dbProd.sale_price || 0,
      gstRate: dbProd.GST_RATE || dbProd.gst_rate || 18,
    };
    setLines(updated);
    // Focus quantity field for faster entry
    setTimeout(() => {
      const qtyInputs = document.querySelectorAll(`[data-qty-idx="${idx}"]`);
      if (qtyInputs[0]) {
        qtyInputs[0].focus();
        qtyInputs[0].select();
      }
    }, 50);
  };
  const updateLine  = (idx, field, val) => { const u = [...lines]; u[idx] = { ...u[idx], [field]: val }; setLines(u); };
  const addLine     = () => setLines([...lines, defaultLine()]);
  const removeLine  = (idx) => setLines(lines.filter((_, i) => i !== idx));

  const calcLine = (line) => {
    const taxable = parseFloat(line.unitPrice || 0) * parseInt(line.quantity || 0);
    const gst = (taxable * parseFloat(line.gstRate || 0)) / 100;
    const halfGst = gst / 2;
    return { taxable, gst, total: taxable + gst, cgst: isIGST ? 0 : halfGst, sgst: isIGST ? 0 : halfGst, igst: isIGST ? gst : 0 };
  };

  const subtotal   = lines.reduce((s, l) => s + calcLine(l).taxable, 0);
  const totalCGST  = lines.reduce((s, l) => s + calcLine(l).cgst,    0);
  const totalSGST  = lines.reduce((s, l) => s + calcLine(l).sgst,    0);
  const totalIGST  = lines.reduce((s, l) => s + calcLine(l).igst,    0);
  const discountAmt = parseFloat(discount || 0);
  const grandTotal = subtotal + totalCGST + totalSGST + totalIGST - discountAmt;

  // ── SALE: save ─────────────────────────────────────────────────────────────
  const handleSaveSale = async () => {
    if (!partyName.trim()) return alert('Please enter Customer Name');
    const missingName = lines.find(l => !l.product && !l.productName?.trim());
    if (missingName) return alert('Each item must have a product name or be selected from the list');
    setSaving(true);
    try {
      const res = await axios.post(`${API}/sales`, {
        saleDate: invoiceDate,
        customerName: partyName, customerGSTIN: partyGSTIN,
        customerPhone: partyPhone, customerEmail: partyEmail,
        orderType: 'SALE', is_igst: isIGST, discount: discountAmt, paymentMethod, notes,
        items: lines.map(l => ({
          product: l.product || null,
          product_name: l.productName?.trim() || '',
          productName: l.productName?.trim() || '',
          quantity: parseInt(l.quantity),
          sellingPrice: parseFloat(l.unitPrice),
          gstRate: parseFloat(l.gstRate),
          hsnCode: l.hsnCode
        }))
      }, getConfig());
      setSavedTx(res.data.data);
      await Promise.all([fetchProducts(), fetchHistory()]);
      setLines([defaultLine()]);
      setPartyName(''); setPartyPhone(''); setPartyGSTIN(''); setPartyEmail('');
      setNotes(''); setDiscount(0); setCustomerStatus('idle');
    } catch (e) {
      alert(e.response?.data?.error || e.response?.data?.message || 'Error saving sale');
    } finally {
      setSaving(false);
    }
  };

  // ── RETURN: invoice lookup ─────────────────────────────────────────────────
  const handleReturnLookup = async () => {
    if (!returnInvoiceRef.trim()) return;
    setReturnLookupLoading(true);
    setReturnLookupError('');
    setReturnInvoiceData(null);
    setReturnItems([]);
    try {
      const ref = returnInvoiceRef.trim();
      const param = /^\d+$/.test(ref) ? `sale_id=${ref}` : `invoice_number=${encodeURIComponent(ref)}`;
      const res = await axios.get(`${API}/sales/return/lookup?${param}`, getConfig());
      const data = res.data.data;
      setReturnInvoiceData(data);
      // Pre-fill return items (only those with returnable qty > 0)
      setReturnItems(
        data.items
          .filter(i => i.qty_returnable > 0)
          .map(i => ({ ...i, return_qty: 0 }))
      );
    } catch (e) {
      setReturnLookupError(e.response?.data?.error || 'Invoice not found');
    } finally {
      setReturnLookupLoading(false);
    }
  };

  const updateReturnQty = (productId, val) => {
    setReturnItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, return_qty: Math.max(0, Math.min(Number(val), i.qty_returnable)) } : i
    ));
  };

  // ── RETURN: GST preview ────────────────────────────────────────────────────
  const calcReturnLine = (item) => {
    const qty     = parseFloat(item.return_qty || 0);
    const price   = parseFloat(item.unit_price || 0);
    const gstRate = parseFloat(item.gst_rate || 0);
    const taxable = qty * price;
    const isIG    = returnInvoiceData?.is_igst;
    const cgst    = isIG ? 0 : Math.round(taxable * (gstRate / 2) / 100 * 100) / 100;
    const sgst    = isIG ? 0 : Math.round(taxable * (gstRate / 2) / 100 * 100) / 100;
    const igst    = isIG ? Math.round(taxable * gstRate / 100 * 100) / 100 : 0;
    return { taxable, cgst, sgst, igst, total: taxable + cgst + sgst + igst };
  };

  const returnSubtotal  = returnItems.reduce((s, i) => s + calcReturnLine(i).taxable, 0);
  const returnTaxCGST   = returnItems.reduce((s, i) => s + calcReturnLine(i).cgst, 0);
  const returnTaxSGST   = returnItems.reduce((s, i) => s + calcReturnLine(i).sgst, 0);
  const returnTaxIGST   = returnItems.reduce((s, i) => s + calcReturnLine(i).igst, 0);
  const returnTotal     = returnItems.reduce((s, i) => s + calcReturnLine(i).total, 0);
  const hasReturnItems  = returnItems.some(i => i.return_qty > 0);

  // ── RETURN: submit ─────────────────────────────────────────────────────────
  const handleSaveReturn = async () => {
    if (!returnInvoiceData) return alert('Please look up an invoice first');
    if (!hasReturnItems) return alert('Enter a return quantity for at least one item');
    const toReturn = returnItems.filter(i => i.return_qty > 0).map(i => ({
      product_id: i.product_id, quantity: i.return_qty
    }));
    setSaving(true);
    try {
      const ref = returnInvoiceRef.trim();
      const payload = {
        invoice_number: /^\d+$/.test(ref) ? undefined : ref,
        sale_id:        /^\d+$/.test(ref) ? parseInt(ref) : undefined,
        return_date: returnDate,
        notes: returnNotes,
        items: toReturn
      };
      const res = await axios.post(`${API}/sales/return`, payload, getConfig());
      setSavedReturn(res.data.data);
      await fetchHistory();
      // Reset form
      setReturnInvoiceRef('');
      setReturnInvoiceData(null);
      setReturnItems([]);
      setReturnNotes('');
    } catch (e) {
      alert(e.response?.data?.error || 'Error creating return');
    } finally {
      setSaving(false);
    }
  };

  // ── Print invoice ──────────────────────────────────────────────────────────
  const handlePrint = async (tx) => {
    // Open window immediately to avoid popup blocker
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups for this website to print invoices');
      return;
    }
    
    // Show loading message
    win.document.write('<html><body style="font-family:Arial,sans-serif;padding:50px;text-align:center;"><h2>Loading invoice...</h2></body></html>');
    
    let fullTx = tx;
    if (!tx.items || tx.items.length === 0) {
      try {
        const res = await axios.get(`${API}/sales/${tx.SALE_ID || tx.sale_id}`, getConfig());
        fullTx = res.data.data || res.data;
      } catch { 
        alert('Error fetching sale details for print'); 
        win.close();
        return; 
      }
    }
    
    const items = fullTx.items || fullTx.products || [];
    
    if (items.length === 0) {
      alert('No items found in this transaction');
      win.close();
      return;
    }
    
    // Use business settings with fallback defaults
    const bs = businessSettings.businessName ? businessSettings : {
      businessName: 'My Business',
      tradeName: '',
      gstin: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: ''
    };
    
    // Calculate totals
    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalAmount = 0;
    items.forEach(p => {
      const taxable = p.TAXABLE_AMOUNT || p.taxable_amount || (p.unit_price * p.quantity) || 0;
      const gstRate = p.GST_RATE || p.gst_rate || 0;
      const cgst = p.CGST_AMOUNT || p.cgst_amount || (taxable * gstRate / 200);
      const sgst = p.SGST_AMOUNT || p.sgst_amount || (taxable * gstRate / 200);
      const igst = p.IGST_AMOUNT || p.igst_amount || 0;
      const total = p.TOTAL_AMOUNT || p.total_amount || (taxable + cgst + sgst + igst);
      
      totalTaxable += taxable;
      totalCGST += cgst;
      totalSGST += sgst;
      totalIGST += igst;
      totalAmount += total;
    });
    
    const discount = fullTx.DISCOUNT || fullTx.discount || 0;
    const grandTotal = totalAmount - discount;
    const isIGST = totalIGST > 0;
    
    // Number to Words function for Indian Rupee format
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
        if (scaleIndex === 0) {
          chunk = num % 1000;
          num = Math.floor(num / 1000);
        } else {
          chunk = num % 100;
          num = Math.floor(num / 100);
        }
        
        if (chunk > 0) {
          result = convert(chunk, scales[scaleIndex]) + scales[scaleIndex] + ' ' + result;
        }
        scaleIndex++;
      }
      
      return result.trim();
    };
    
    const inv = invoiceSettings || {};
    const showHSN = inv.showHSN !== false;
    const showGSTBreakup = inv.showGSTBreakup !== false;
    const invoiceTerms = (typeof inv.invoiceTerms === 'string' && inv.invoiceTerms.trim() !== '') 
      ? inv.invoiceTerms 
      : '1. Goods once sold cannot be returned or exchanged.\n2. Payment is due within 30 days from the invoice date.\n3. Interest @18% p.a. will be charged on overdue amounts.\n4. All disputes subject to local jurisdiction.';
    const footerNotes = typeof inv.footerNotes === 'string' ? inv.footerNotes : '';
    
    try {
      // Build items table rows
      let rowsHtml = '';
      let sno = 1;
      for (const p of items) {
        const taxable = Number(p.TAXABLE_AMOUNT || p.taxable_amount || (p.unit_price * p.quantity) || 0);
        const gstRate = Number(p.GST_RATE || p.gst_rate || 0);
        const cgst = Number(p.CGST_AMOUNT || p.cgst_amount || (taxable * gstRate / 200));
        const sgst = Number(p.SGST_AMOUNT || p.sgst_amount || (taxable * gstRate / 200));
        const igst = Number(p.IGST_AMOUNT || p.igst_amount || 0);
        const total = Number(p.TOTAL_AMOUNT || p.total_amount || (taxable + cgst + sgst + igst));
        
        rowsHtml += `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${sno++}</td>
            <td style="padding:8px;border:1px solid #ddd">${p.PRODUCT_NAME || p.product_name || '-'}</td>
            ${showHSN ? `<td style="padding:8px;border:1px solid #ddd;text-align:center">${p.HSN_CODE || p.hsn_code || '-'}</td>` : ''}
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${p.QUANTITY || p.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${Number(p.UNIT_PRICE || p.unit_price || 0).toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${taxable.toFixed(2)}</td>
            ${showGSTBreakup ? `<td style="padding:8px;border:1px solid #ddd;text-align:center">${gstRate}%</td>` : ''}
            ${showGSTBreakup ? (isIGST ? `<td style="padding:8px;border:1px solid #ddd;text-align:right">₹${igst.toFixed(2)}</td>` : `
              <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${cgst.toFixed(2)}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${sgst.toFixed(2)}</td>
            `) : ''}
            <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">₹${total.toFixed(2)}</td>
          </tr>`;
      }
    
    const invoiceDate = new Date(fullTx.INVOICE_DATE || fullTx.invoice_date || fullTx.saleDate).toLocaleDateString('en-IN');
    const customerName = fullTx.CUSTOMER_NAME || fullTx.customerName || fullTx.customer_name || 'Walk-in Customer';
    const customerGSTIN = fullTx.CUSTOMER_GSTIN || fullTx.customerGSTIN || fullTx.customer_gstin || '';
    const customerPhone = fullTx.CUSTOMER_PHONE || fullTx.customerPhone || fullTx.customer_phone || '';
    
    // Clear the loading message and write the full invoice
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Tax Invoice - ${fullTx.INVOICE_NUMBER || fullTx.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      font-size: 12px; 
      line-height: 1.5;
      color: #333;
      background: #fff;
    }
    .invoice-container { 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 30px;
      border: 2px solid #1e40af;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid #1e40af;
      margin-bottom: 20px;
    }
    .company-info h1 {
      color: #1e40af;
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .company-info .trade-name {
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .company-info p {
      color: #555;
      font-size: 11px;
      line-height: 1.6;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      color: #1e40af;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .invoice-title .invoice-number {
      font-size: 14px;
      color: #666;
      font-weight: bold;
    }
    .gst-badge {
      background: #1e40af;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      display: inline-block;
      margin-top: 8px;
    }
    .parties {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .party-box {
      flex: 1;
      padding: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .party-box h3 {
      color: #1e40af;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #1e40af;
    }
    .party-box p {
      margin: 4px 0;
      font-size: 11px;
    }
    .party-box .label {
      color: #666;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 11px;
    }
    th {
      background: #1e40af;
      color: white;
      padding: 10px 8px;
      text-align: center;
      font-weight: 600;
      border: 1px solid #1e40af;
    }
    td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .summary-table {
      width: 350px;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 8px 12px;
      border: 1px solid #ddd;
    }
    .summary-table .label {
      text-align: left;
      background: #f8fafc;
      font-weight: 600;
    }
    .summary-table .value {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .summary-table .grand-total {
      background: #1e40af;
      color: white;
      font-size: 14px;
      font-weight: bold;
    }
    .summary-table .grand-total td {
      border-color: #1e40af;
    }
    .amount-in-words {
      margin-top: 20px;
      padding: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .amount-in-words h4 {
      color: #1e40af;
      font-size: 11px;
      margin-bottom: 5px;
    }
    .amount-in-words p {
      font-size: 12px;
      font-weight: 600;
      font-style: italic;
    }
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
    }
    .terms {
      flex: 1;
      font-size: 10px;
      color: #666;
    }
    .terms h4 {
      color: #1e40af;
      margin-bottom: 8px;
    }
    .signature {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 35px;
      padding-top: 8px;
      font-weight: 600;
    }
    .bank-details {
      margin-top: 15px;
      padding: 10px;
      background: #f0f7ff;
      border: 1px dashed #1e40af;
      border-radius: 4px;
      font-size: 10px;
    }
    @media print {
      body { padding: 0; }
      .invoice-container { border: 2px solid #1e40af; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>${bs.businessName || 'My Business'}</h1>
        ${bs.tradeName ? `<div class="trade-name">${bs.tradeName}</div>` : ''}
        <p>
          ${bs.address ? bs.address + '<br>' : ''}
          ${bs.city ? bs.city : ''}${bs.state ? ', ' + bs.state : ''}${bs.pincode ? ' - ' + bs.pincode : ''}
          ${bs.phone ? '<br>📞 ' + bs.phone : ''}
          ${bs.email ? '<br>✉️ ' + bs.email : ''}
          ${bs.gstin ? '<br><span class="gst-badge">GSTIN: ' + bs.gstin + '</span>' : ''}
        </p>
      </div>
      <div class="invoice-title">
        <h2>TAX INVOICE</h2>
        <div class="invoice-number">${inv.invoicePrefix || ''}${fullTx.INVOICE_NUMBER || fullTx.invoice_number}${inv.invoiceSuffix || ''}</div>
        <div style="margin-top:10px;font-size:11px;color:#666">
          Date: ${invoiceDate}
        </div>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party-box" style="margin-right: 20px;">
        <h3>Bill To</h3>
        <p><strong>${customerName}</strong></p>
        ${customerGSTIN ? `<p><span class="label">GSTIN:</span> ${customerGSTIN}</p>` : ''}
        ${customerPhone ? `<p><span class="label">Phone:</span> ${customerPhone}</p>` : ''}
      </div>
      <div style="flex: 1;"></div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:25%">Product Description</th>
          ${showHSN ? '<th style="width:10%">HSN</th>' : ''}
          <th style="width:8%">Qty</th>
          <th style="width:12%">Rate</th>
          <th style="width:12%">Taxable</th>
          ${showGSTBreakup ? '<th style="width:8%">GST%</th>' : ''}
          ${showGSTBreakup ? (isIGST ? '<th style="width:12%">IGST</th>' : '<th style="width:10%">CGST</th><th style="width:10%">SGST</th>') : ''}
          <th style="width:12%">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Summary -->
    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td class="label">Sub Total</td>
          <td class="value">₹${totalTaxable.toFixed(2)}</td>
        </tr>
        ${isIGST ? `
        <tr>
          <td class="label">IGST</td>
          <td class="value">₹${totalIGST.toFixed(2)}</td>
        </tr>
        ` : `
        <tr>
          <td class="label">CGST</td>
          <td class="value">₹${totalCGST.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">SGST</td>
          <td class="value">₹${totalSGST.toFixed(2)}</td>
        </tr>
        `}
        ${discount > 0 ? `
        <tr>
          <td class="label">Discount</td>
          <td class="value" style="color:#dc2626">-₹${discount.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr class="grand-total">
          <td class="label">GRAND TOTAL</td>
          <td class="value">₹${grandTotal.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- Amount in Words -->
    <div class="amount-in-words">
      <h4>Amount in Words:</h4>
      <p>${numberToWords(Math.round(grandTotal))} Rupees Only</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="terms">
        <h4>Terms & Conditions:</h4>
        ${invoiceTerms.split('\n').map(t => `<p>${t}</p>`).join('')}
      </div>
      <div class="signature">
        <div class="signature-line">Authorized Signature</div>
        <p style="font-size:10px;color:#666;margin-top:5px">For ${bs.businessName || 'My Business'}</p>
      </div>
    </div>
    
    ${footerNotes ? `
    <div style="margin-top: 15px; text-align: center; color: #666; font-size: 11px; border-top: 1px dashed #ccc; padding-top: 10px; page-break-inside: avoid;">
      ${footerNotes.replace(/\n/g, '<br>')}
    </div>
    ` : ''}
  </div>

  <script>
    setTimeout(function() {
      window.print();
    }, 500);
  </script>
</body>
</html>`);
      win.document.close();
    } catch (err) {
      if (!win.closed) {
        win.document.open();
        win.document.write('<html><body style="font-family:sans-serif;padding:20px;"><h2>Print Error</h2><pre style="color:red;">' + err.stack + '</pre></body></html>');
        win.document.close();
      }
    }
  };

  const paymentColors = {
    CASH: 'bg-green-100 text-green-800', UPI: 'bg-purple-100 text-purple-800',
    CARD: 'bg-blue-100 text-blue-800', CREDIT: 'bg-red-100 text-red-800',
    BANK_TRANSFER: 'bg-gray-100 text-gray-800'
  };

  if (!user?.token) {
    return <div className="p-8 text-center"><div className="text-red-600 font-semibold">⚠️ Authentication Required</div></div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-green-500" /> Sales Module
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Record sales and process returns. Stock and GST updated automatically.</p>
        </div>
        <button onClick={() => setView(view === 'history' ? 'form' : 'history')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          {view === 'history' ? '+ New Transaction' : '📋 Sales History'}
        </button>
      </div>

      {/* ── Tab selector ─────────────────────────────────────────────────── */}
      {view !== 'history' && (
        <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl w-fit">
          <button onClick={() => { setView('form'); setOrderType('SALE'); setSavedReturn(null); setSavedTx(null); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition ${view === 'form' ? 'bg-white dark:bg-gray-600 shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <Plus size={16} /> New Sale
          </button>
          <button onClick={() => { setView('return'); setOrderType('RETURN'); setSavedReturn(null); setSavedTx(null); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition ${view === 'return' ? 'bg-white dark:bg-gray-600 shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <RotateCcw size={16} /> Sales Return
          </button>
        </div>
      )}

      {/* ── Success banners ────────────────────────────────────────────────── */}
      {savedTx && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 dark:text-green-300">Sale saved! Invoice: <strong>{savedTx.invoiceNumber || savedTx.invoice_number}</strong></p>
            <p className="text-sm text-green-700 dark:text-green-400">Grand Total: ₹{(savedTx.grandTotal || 0).toFixed(2)}</p>
          </div>
          <button onClick={() => handlePrint(savedTx)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"><Printer size={14} /> Print</button>
          <button onClick={() => setSavedTx(null)} className="text-green-500 hover:text-green-700 text-xl">×</button>
        </div>
      )}

      {savedReturn && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
          <CheckCircle className="text-orange-600 w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-orange-800 dark:text-orange-300">Return processed! <strong>{savedReturn.return_number}</strong></p>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Refund Amount: ₹{(savedReturn.totals?.total_refund || 0).toFixed(2)} &nbsp;|&nbsp;
              Invoice Status: <strong>{savedReturn.invoice_status?.replace(/_/g, ' ')}</strong>
            </p>
          </div>
          <button onClick={() => setSavedReturn(null)} className="text-orange-500 hover:text-orange-700 text-xl">×</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SALE FORM                                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {view === 'form' && (
        <div className="space-y-5">
          {/* Customer info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wide">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Customer name with suggestions */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Customer Name *</label>
                <div className="relative">
                  <Autocomplete
                    placeholder="e.g. Rahul Sharma"
                    value={partyName || ''}
                    onChange={(val) => { setPartyName(val); setCustomerStatus('idle'); }}
                    onSelect={selectCustomer}
                    searchEndpoint={`${API}/sales/customers/search`}
                    labelKey="customer_name"
                    valueKey="customer_id"
                    renderItem={(cust) => (
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{cust.CUSTOMER_NAME || cust.customer_name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{cust.CUSTOMER_GST || cust.customer_gst || 'No GSTIN'}</p>
                        </div>
                        {(cust.TOTAL_ORDERS !== undefined || cust.total_orders !== undefined) && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{cust.TOTAL_ORDERS || cust.total_orders} Orders</span>
                        )}
                      </div>
                    )}
                    inputClassName="!pl-9 !bg-white dark:!bg-gray-700"
                  />
                  <User className="absolute left-3 top-2.5 text-gray-400 z-10" size={14} style={{ pointerEvents: 'none' }} />
                </div>
                {partyName && customerStatus === 'known' && (
                  <span className="mt-1.5 text-[10px] flex items-center gap-1 font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded w-fit"><CheckCircle size={10} /> Existing Customer</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone <span className="text-gray-400">(Optional)</span></label>
                <input value={partyPhone} onChange={e => setPartyPhone(e.target.value)} placeholder="9876543210" maxLength={15}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">GSTIN <span className="text-gray-400">(Optional)</span></label>
                <input value={partyGSTIN} onChange={e => setPartyGSTIN(e.target.value)} placeholder="22AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sale Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI</option>
                  <option value="CARD">💳 Card</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                  <option value="CREDIT">📝 Credit</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isIGST} onChange={e => setIsIGST(e.target.checked)} className="w-4 h-4 rounded text-green-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Inter-state sale → Use <strong>IGST</strong></span>
              </label>
            </div>
          </div>

          {/* Product lines */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">Items Sold</h3>
              <button onClick={addLine} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"><Plus size={14} /> Add Item</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-24">HSN</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-32">Price (₹)</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-24">GST %</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-28">Total (₹)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lines.map((line, idx) => {
                    const calc = calcLine(line);
                    const dbProd = products.find(p => String(p.PRODUCT_ID || p.product_id) === String(line.product));
                    const isLow = dbProd && (dbProd.QUANTITY || dbProd.quantity || 0) < parseInt(line.quantity || 0);
                    return (
                      <tr key={idx} className={`${isLow ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                        <td className="px-3 py-2 min-w-[250px] relative">
                          <Autocomplete
                            placeholder="Search product or HSN..."
                            value={line.productName}
                            onChange={(val) => handleProductInputChange(idx, val)}
                            onSelect={(product) => handleSelectProduct(idx, product)}
                            searchEndpoint={`${API}/products/search`}
                            labelKey="PRODUCT_NAME"
                            valueKey="PRODUCT_ID"
                            showCreateOption={false}
                            renderItem={(product) => {
                              const stock = product.QUANTITY || product.quantity || 0;
                              return (
                                <div className="flex justify-between items-center w-full">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{product.PRODUCT_NAME || product.product_name}</span>
                                    <span className="text-[10px] text-gray-500 uppercase font-medium">HSN: {product.HSN_CODE || product.hsn_code || 'N/A'}</span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-bold text-green-600">₹{parseFloat(product.SALE_PRICE || product.sale_price || 0).toFixed(2)}</span>
                                    <span className={`text-[10px] mt-0.5 px-1.5 rounded-full font-bold ${stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>Stock: {stock}</span>
                                  </div>
                                </div>
                              );
                            }}
                            inputClassName="!bg-white dark:!bg-gray-700 border-gray-300 dark:border-gray-600"
                          />
                          {isLow && <p className="text-[10px] text-red-500 mt-1 mx-2">⚠️ Insufficient stock</p>}
                        </td>
                        <td className="px-3 py-2"><input value={line.hsnCode} onChange={e => updateLine(idx, 'hsnCode', e.target.value)} placeholder="e.g. 8471" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm" /></td>
                        <td className="px-3 py-2">
                          <input 
                            type="number" min="1" 
                            data-qty-idx={idx}
                            value={line.quantity} 
                            onChange={e => updateLine(idx, 'quantity', e.target.value)} 
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm" 
                          />
                        </td>
                        <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm" /></td>
                        <td className="px-3 py-2">
                          <select value={line.gstRate} onChange={e => updateLine(idx, 'gstRate', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm">
                            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold font-mono text-xs">₹{calc.total.toFixed(2)}</td>
                        <td className="px-3 py-2">{lines.length > 1 && <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary + Save */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"><span>Subtotal (Taxable)</span><span className="font-mono">₹{subtotal.toFixed(2)}</span></div>
              {!isIGST ? (<>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"><span>CGST</span><span className="font-mono">₹{totalCGST.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"><span>SGST</span><span className="font-mono">₹{totalSGST.toFixed(2)}</span></div>
              </>) : (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"><span>IGST</span><span className="font-mono">₹{totalIGST.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 items-center">
                <span className="flex items-center gap-2"><Tag size={14} /> Discount (₹)</span>
                <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)}
                  className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-right font-mono focus:ring-1 focus:ring-green-500 focus:outline-none" />
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-600" />
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white"><span>Grand Total</span><span className="font-mono text-green-600">₹{grandTotal.toFixed(2)}</span></div>
              <button onClick={handleSaveSale} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition disabled:opacity-50">
                <Save size={17} />{saving ? 'Saving...' : 'Save Sale & Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* RETURN FORM                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {view === 'return' && (
        <div className="space-y-5">
          {/* Invoice lookup */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} className="text-orange-500" /> Step 1 — Look Up Original Invoice
            </h3>
            <div className="flex gap-3">
              <input value={returnInvoiceRef} onChange={e => setReturnInvoiceRef(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReturnLookup()}
                placeholder="Enter Invoice Number (e.g. SALE-1775359426956) or Sale ID"
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono" />
              <button onClick={handleReturnLookup} disabled={returnLookupLoading || !returnInvoiceRef.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                {returnLookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {returnLookupLoading ? 'Looking up...' : 'Find Invoice'}
              </button>
            </div>
            {returnLookupError && (
              <div className="mt-3 flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                <AlertCircle size={16} />{returnLookupError}
              </div>
            )}
          </div>

          {/* Invoice details + return items */}
          {returnInvoiceData && (
            <>
              {/* Invoice info panel */}
              <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30">
                <div className="flex flex-wrap gap-6 items-start">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice</p>
                    <p className="font-bold font-mono text-gray-900 dark:text-white">{returnInvoiceData.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Customer</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{returnInvoiceData.customer_name || '—'}</p>
                    {returnInvoiceData.customer_gst && <p className="text-xs font-mono text-gray-500">{returnInvoiceData.customer_gst}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Sale Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {returnInvoiceData.invoice_date ? new Date(returnInvoiceData.invoice_date).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tax Type</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{returnInvoiceData.is_igst ? 'IGST' : 'CGST + SGST'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                    <StatusBadge status={returnInvoiceData.status} />
                  </div>
                </div>
              </div>

              {/* Step 2 — Select return quantities */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
                    <Package size={16} className="text-orange-500" /> Step 2 — Select Return Quantities
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Enter the quantity to return for each product. Cannot exceed returnable quantity.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-orange-50/50 dark:bg-orange-900/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sold</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Returned</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Returnable</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-32">Return Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">GST</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {returnItems.map(item => {
                        const calc = calcReturnLine(item);
                        const isExceeded = item.return_qty > item.qty_returnable;
                        return (
                          <tr key={item.product_id} className={`${isExceeded ? 'bg-red-50' : item.return_qty > 0 ? 'bg-orange-50/30 dark:bg-orange-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900 dark:text-white">{item.product_name}</p>
                              {item.hsn_code && <p className="text-xs text-gray-400 font-mono">HSN: {item.hsn_code}</p>}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-sm text-gray-600">{item.qty_sold}</td>
                            <td className="px-4 py-3 text-center font-mono text-sm text-orange-500">{item.qty_returned}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.qty_returnable > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {item.qty_returnable}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <input type="number" min="0" max={item.qty_returnable} value={item.return_qty}
                                onChange={e => updateReturnQty(item.product_id, e.target.value)}
                                className={`w-full px-3 py-1.5 border rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 ${isExceeded ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-orange-200 focus:ring-orange-400 bg-white dark:bg-gray-700 dark:border-gray-600'}`} />
                              {isExceeded && <p className="text-xs text-red-500 mt-0.5 text-center">Max: {item.qty_returnable}</p>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm">₹{(item.unit_price || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-mono text-sm text-orange-600">
                              ₹{(calc.cgst + calc.sgst + calc.igst).toFixed(2)}
                              <div className="text-[10px] text-gray-400">
                                {returnInvoiceData.is_igst
                                  ? `IGST: ${item.gst_rate}%`
                                  : `CGST+SGST: ${item.gst_rate}%`}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold font-mono text-orange-700">
                              {item.return_qty > 0 ? `₹${calc.total.toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Return summary + date + save */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Return Date</label>
                    <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notes / Reason</label>
                    <textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} rows={3}
                      placeholder="Defective, wrong item, customer request..."
                      className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl p-5 border border-orange-200 dark:border-orange-800/30 space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-white text-sm uppercase tracking-wide">GST Reversal Summary</h4>
                  <div className="flex justify-between text-sm text-gray-600"><span>Return Subtotal</span><span className="font-mono">₹{returnSubtotal.toFixed(2)}</span></div>
                  {!returnInvoiceData.is_igst ? (<>
                    <div className="flex justify-between text-sm text-gray-600"><span>CGST Reversed</span><span className="font-mono text-orange-600">₹{returnTaxCGST.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>SGST Reversed</span><span className="font-mono text-orange-600">₹{returnTaxSGST.toFixed(2)}</span></div>
                  </>) : (
                    <div className="flex justify-between text-sm text-gray-600"><span>IGST Reversed</span><span className="font-mono text-orange-600">₹{returnTaxIGST.toFixed(2)}</span></div>
                  )}
                  <div className="h-px bg-orange-200" />
                  <div className="flex justify-between text-lg font-bold text-orange-700">
                    <span>Total Refund</span><span className="font-mono">₹{returnTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={handleSaveReturn} disabled={saving || !hasReturnItems || returnItems.some(i => i.return_qty > i.qty_returnable)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition disabled:opacity-50">
                    <RotateCcw size={17} />{saving ? 'Processing...' : 'Process Sales Return'}
                  </button>
                  {!hasReturnItems && <p className="text-xs text-center text-orange-500">Enter return quantity for at least one item above</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* HISTORY TABLE                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {view === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Tax</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Grand Total</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map(tx => (
                <tr key={tx.SALE_ID || tx.sale_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4"><StatusBadge status={tx.STATUS || tx.status || 'ACTIVE'} /></td>
                  <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">{tx.INVOICE_NUMBER || tx.invoice_number || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{tx.CUSTOMER_NAME || tx.customer_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(tx.INVOICE_DATE || tx.invoice_date || tx.CREATED_AT || tx.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4 text-right text-sm font-mono">₹{(Number(tx.SUBTOTAL || tx.subtotal) || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-sm font-mono text-orange-600">₹{(Number(tx.TOTAL_TAX || tx.total_tax) || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold font-mono">₹{(Number(tx.GRAND_TOTAL || tx.grand_total) || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${paymentColors[tx.PAYMENT_METHOD || tx.payment_method] || 'bg-gray-100 text-gray-800'}`}>
                      {tx.PAYMENT_METHOD || tx.payment_method || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button onClick={() => handlePrint(tx)} className="text-gray-500 hover:text-green-600 transition" title="Print Invoice"><Printer size={16} /></button>
                    {(tx.STATUS || tx.status) !== 'FULLY_RETURNED' && (
                      <button title="Create Return"
                        onClick={() => { setView('return'); setReturnInvoiceRef(tx.INVOICE_NUMBER || tx.invoice_number || ''); }}
                        className="text-gray-400 hover:text-orange-500 transition"><RotateCcw size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-400">No sales recorded yet.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
