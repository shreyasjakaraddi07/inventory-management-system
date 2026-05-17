import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, Save, ShoppingCart, CheckCircle, AlertCircle, Loader, Search, ChevronDown, Tag, RotateCcw, FileText, History, Eye, Calendar, User, Package, X, ArrowRight, Phone, Mail, Hash
} from 'lucide-react';
import Autocomplete from '../components/Autocomplete';

const API = 'http://localhost:8080/api';

// Get auth headers
const getConfig = () => {
  const userInfo = localStorage.getItem('userInfo');
  const token = userInfo ? JSON.parse(userInfo).token : '';
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

const Purchase = () => {
  // Navigation State
  const [view, setView] = useState('form'); // 'form', 'return', 'history'

  // Purchase Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierGST, setSupplierGST] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', product_name: '', hsn_code: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false }
  ]);
  const [products, setProducts] = useState([]);
  const [isIGST, setIsIGST] = useState(false);

  // Return Form State
  const [returnInvoiceRef, setReturnInvoiceRef] = useState('');
  const [returnLookupLoading, setReturnLookupLoading] = useState(false);
  const [returnLookupError, setReturnLookupError] = useState('');
  const [returnInvoiceData, setReturnInvoiceData] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [savedReturn, setSavedReturn] = useState(null);
  const [returnSearchResults, setReturnSearchResults] = useState([]);

  // History State
  const [historyPurchases, setHistoryPurchases] = useState([]);
  const [historyReturns, setHistoryReturns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryType, setShowHistoryType] = useState('purchases'); // 'purchases' or 'returns'
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // UI General State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedPurchase, setSavedPurchase] = useState(null);
  const [productSearchIndex, setProductSearchIndex] = useState(-1);
  const [productSearchResults, setProductSearchResults] = useState([]);
  const searchTimeoutRef = useRef(null);
  const productSearchTimeoutRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API}/suppliers`, getConfig());
      setSuppliers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/products`, getConfig());
      setProducts(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err.message);
    }
  };

  // --- HISTORY LOGIC ---
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const [purchasesRes, returnsRes] = await Promise.all([
        axios.get(`${API}/purchases`, getConfig()),
        axios.get(`${API}/purchases/returns`, getConfig())
      ]);
      setHistoryPurchases(purchasesRes.data.data || []);
      setHistoryReturns(returnsRes.data.data || []);
    } catch (err) {
      console.error('History fetch failed:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'history') {
      fetchHistory();
    }
  }, [view]);

  const viewTransactionDetails = async (id, type) => {
    setDetailLoading(true);
    setIsDetailModalOpen(true);
    try {
      const endpoint = type === 'purchase' ? `/purchases/${id}` : `/purchase-returns/${id}`;
      const res = await axios.get(`${API}${endpoint}`, getConfig());
      setSelectedTransaction({ ...res.data.data, type });
    } catch (err) {
      console.error('Failed to fetch details:', err.message);
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // --- SUPPLIER LOGIC ---
  const handleSupplierSearch = (value) => {
    setSupplierName(value);
    setShowSearchResults(true);
    setIsNewSupplier(false);
    setSupplierId('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/suppliers/search?q=${encodeURIComponent(value)}`, getConfig());
        setSearchResults(res.data.data || []);
      } catch (err) { setSearchResults([]); }
    }, 300);
  };

  const handleSelectSupplier = (supplier) => {
    console.log('👤 Selecting Supplier:', supplier);
    
    // Handle newly created supplier (from Autocomplete auto-create)
    if (supplier.isNew) {
      setSupplierId('');
      setSupplierName(supplier.supplier_name || '');
      setSupplierGST('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSelectedSupplier(null);
      setIsNewSupplier(true);
      return;
    }
    
    // Handle existing supplier from database
    setSupplierId(supplier.SUPPLIER_ID || supplier.supplier_id || '');
    setSupplierName(supplier.SUPPLIER_NAME || supplier.supplier_name || '');
    setSupplierGST(supplier.GST_NUMBER || supplier.gst_number || '');
    setSupplierPhone(supplier.PHONE_NUMBER || supplier.phone_number || '');
    setSupplierEmail(supplier.EMAIL_ID || supplier.email_id || '');
    setSelectedSupplier(supplier);
    setIsNewSupplier(false);
    setShowSearchResults(false);
  };

  // --- PRODUCT/ITEM LOGIC ---
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'product_id' && value) {
      const product = products.find(p => (p.PRODUCT_ID || p.product_id) === parseInt(value));
      if (product) {
        newItems[index].product_name = product.PRODUCT_NAME || product.product_name;
        newItems[index].hsn_code = product.HSN_CODE || product.hsn_code || '';
        newItems[index].gst_rate = product.GST_RATE || product.gst_rate || 18;
        newItems[index].unit_price = product.PURCHASE_PRICE || product.purchase_price || 0;
      }
    }
    setItems(newItems);
  };

  const searchPurchaseProducts = async (value) => {
    if (!value.trim()) {
      setProductSearchResults((products || []).slice(0, 10));
      return;
    }
    try {
      const res = await axios.get(`${API}/products?keyword=${encodeURIComponent(value)}`, getConfig());
      setProductSearchResults(res.data.data || []);
    } catch (err) {
      setProductSearchResults([]);
    }
  };

  const handleProductInputChange = (index, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], product_name: value, product_id: '' };
    setItems(newItems);
    setProductSearchIndex(index);

    if (productSearchTimeoutRef.current) clearTimeout(productSearchTimeoutRef.current);
    productSearchTimeoutRef.current = setTimeout(() => searchPurchaseProducts(value), 300);
  };

  const handleSelectProduct = (index, product) => {
    console.log('🎯 Selecting Product for index:', index, product);
    const newItems = [...items];
    
    // Handle newly created product (from Autocomplete auto-create)
    if (product.isNew) {
      newItems[index] = {
        product_id: '', // Will be created on server
        product_name: product.product_name || '',
        hsn_code: '',
        gst_rate: 18,
        unit_price: 0,
        quantity: newItems[index].quantity || 1,
        is_igst: newItems[index].is_igst || false
      };
      setItems(newItems);
      return;
    }
    
    // Handle existing product from database
    newItems[index] = {
      product_id: product.PRODUCT_ID || product.product_id || '',
      product_name: product.PRODUCT_NAME || product.product_name || '',
      hsn_code: product.HSN_CODE || product.hsn_code || '',
      gst_rate: product.GST_RATE || product.gst_rate || 18,
      unit_price: product.PURCHASE_PRICE || product.purchase_price || 0,
      quantity: newItems[index].quantity || 1,
      is_igst: newItems[index].is_igst || false
    };
    setItems(newItems);
    setProductSearchIndex(-1);
    setProductSearchResults([]);
  };

  const addItem = () => setItems([...items, { product_id: '', product_name: '', hsn_code: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const calculateTotals = () => {
    let taxable = 0, cgst = 0, sgst = 0, igst = 0;
    items.forEach(item => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unit_price) || 0;
      const g = parseFloat(item.gst_rate) || 0;
      const tax = q * p;
      taxable += tax;
      if (isIGST || item.is_igst) igst += (tax * g) / 100;
      else { cgst += (tax * g) / 200; sgst += (tax * g) / 200; }
    });
    return { taxable, cgst, sgst, igst, total: taxable + cgst + sgst + igst };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName.trim() || !invoiceNumber.trim()) {
      setError('Supplier Name and Invoice Number are required');
      return;
    }

    const invalidItem = items.find(i => !i.product_name.trim() || parseFloat(i.quantity) <= 0 || parseFloat(i.unit_price) < 0);
    if (invalidItem) {
      setError('All items must have a name, quantity > 0, and price >= 0');
      return;
    }

    setLoading(true); setError('');
    try {
      const payload = {
        supplier_id: isNewSupplier ? null : supplierId,
        supplierName: supplierName.trim(),
        supplierGST,
        supplierPhone,
        supplierEmail,
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        paymentMethod,
        items: items.map(item => ({
          product_id: item.product_id || null,
          product_name: item.product_name,
          hsn_code: item.hsn_code,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          gst_rate: parseFloat(item.gst_rate),
          is_igst: isIGST || item.is_igst
        })),
        is_igst: isIGST ? 1 : 0,
        notes
      };

      const res = await axios.post(`${API}/purchases`, payload, getConfig());
      setSuccess(res.data.message || `✅ Purchase saved successfully!`);
      setSavedPurchase(res.data);

      // Reset form
      setSupplierId(''); setSupplierName(''); setSupplierGST(''); setSupplierPhone(''); setSupplierEmail('');
      setInvoiceNumber(''); setItems([{ product_id: '', product_name: '', hsn_code: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false }]);
      setNotes(''); setIsIGST(false); setIsNewSupplier(false); setPaymentMethod('CASH');

      fetchProducts(); // Refresh product list for next auto-fills
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to server. Ensure backend is running on port 8080.');
    } finally {
      setLoading(false);
    }
  };


  // --- RETURN LOGIC ---
  const handleReturnLookup = async (id = null) => {
    // If id is provided, we fetch a specific purchase. Otherwise, we search using the ref.
    const searchVal = id ? null : returnInvoiceRef.trim();
    if (!searchVal && !id) return;

    setReturnLookupLoading(true); 
    setReturnLookupError(''); 
    setReturnInvoiceData(null); 
    setReturnItems([]);
    setReturnSearchResults([]);

    try {
      const url = id 
        ? `${API}/purchase-return/lookup?purchase_id=${id}` 
        : `${API}/purchase-return/lookup?search=${encodeURIComponent(searchVal)}`;
      
      const res = await axios.get(url, getConfig());
      const data = res.data.data;

      // If data has 'purchase', it's a specific purchase detail
      if (data.purchase) {
        setReturnInvoiceData(data.purchase);
        // Oracle returns UPPERCASE column names. Normalize for filtering and initial state.
        setReturnItems(data.items
          .filter(i => (Number(i.QTY_PURCHASED || 0) - Number(i.RETURNED_QTY || 0)) > 0)
          .map(i => ({ 
            ...i, 
            return_qty: 0, 
            // qty_returnable is already calculated in backend as lowercase, but let's be safe
            qty_returnable: Number(i.QTY_PURCHASED || 0) - Number(i.RETURNED_QTY || 0) 
          })));
        setReturnInvoiceRef(data.purchase.INVOICE_NUMBER || data.purchase.item_number || '');
        setReturnSearchResults([]);
      } else if (Array.isArray(data)) {
        // It's a list of search results
        if (data.length === 0) {
          setReturnLookupError('No purchase orders found matching your search.');
        } else if (data.length === 1 && !id) {
          // If only one match, auto-load it
          handleReturnLookup(data[0].PURCHASE_ID);
        } else {
          setReturnSearchResults(data);
        }
      }
    } catch (e) { 
      setReturnLookupError(e.response?.data?.error || 'Lookup failed'); 
    } finally { 
      setReturnLookupLoading(false); 
    }
  };

  const handleSaveReturn = async () => {
    const toReturn = returnItems
      .filter(i => i.return_qty > 0)
      .map(i => ({ product_id: i.PRODUCT_ID, quantity: i.return_qty }));

    if (toReturn.length === 0) return alert('No items selected for return');
    if (!returnNotes || !returnNotes.trim()) return alert('Please provide a reason for return');

    setLoading(true);
    try {
      const res = await axios.post(`${API}/purchase-return`, {
        purchase_id: returnInvoiceData.PURCHASE_ID,
        notes: returnNotes.trim(),
        items: toReturn,
        return_date: new Date().toISOString().split('T')[0]
      }, getConfig());
      
      setSavedReturn(res.data.data);
      setSuccess('Purchase return processed successfully!');
      setReturnInvoiceRef('');
      setReturnInvoiceData(null);
      setReturnItems([]);
      setReturnNotes('');
      
      // Refresh history if open
      if (view === 'history') fetchHistory();
    } catch (e) {
      setError(e.response?.data?.error || 'Return failed');
      alert(e.response?.data?.error || 'Return failed');
    } finally {
      setLoading(false);
    }
  };


  const calcReturnLine = (item) => {
    const q = parseFloat(item.return_qty || 0), p = parseFloat(item.UNIT_PRICE || 0), g = parseFloat(item.GST_RATE || 0);
    const tax = q * p;
    const isIG = false; // logic simplified
    const gst = (tax * g) / 100;
    return { taxable: tax, gst, total: tax + gst };
  };

  const totals = calculateTotals();

  // --- RENDERING ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <ShoppingCart className="text-blue-500" /> Purchase Module
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Record purchases and process returns. Stock and GST updated automatically.</p>
          </div>
          <button
            onClick={() => setView('history')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <History size={16} /> Purchase History
          </button>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => { setView('form'); setSavedReturn(null); setError(''); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${view === 'form' ? 'bg-blue-600 text-white shadow-lg border-blue-500' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
              } border`}
          >
            <Plus size={18} /> New Purchase
          </button>
          <button
            onClick={() => { setView('return'); setSavedReturn(null); setError(''); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${view === 'return' ? 'bg-rose-600 text-white shadow-lg border-rose-500' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
              } border`}
          >
            <RotateCcw size={18} /> Purchase Return
          </button>
        </div>


        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="text-emerald-500" />
            <span className="text-emerald-200 font-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="text-rose-500" />
            <span className="text-rose-200 font-medium">{error}</span>
          </div>
        )}

        {/* --- FORM VIEW --- */}
        {view === 'form' && (
          <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-500">
            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl p-6">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 border-b dark:border-gray-700 pb-4">Supplier Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Supplier Name *</label>
                    <Autocomplete
                      searchEndpoint={`${API}/suppliers`}
                      placeholder="Search for a supplier or type to create..."
                      value={supplierName}
                      onChange={(val) => setSupplierName(val)}
                      onSelect={handleSelectSupplier}
                      labelKey="supplier_name"
                      valueKey="supplier_id"
                      inputClassName="w-full !bg-gray-50 dark:!bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 !text-gray-900 dark:!text-white focus:ring-2 focus:ring-blue-500"
                      renderItem={(s, query) => (
                        <div className="flex justify-between items-center w-full">
                          <div className="text-left">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{s.supplier_name || s.SUPPLIER_NAME}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-mono"><Hash size={10} className="text-blue-400" />{s.gst_number || s.GST_NUMBER || 'No GST'}</span>
                              {(s.phone_number || s.PHONE_NUMBER) && <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400"><Phone size={10} className="text-emerald-400" />{s.phone_number || s.PHONE_NUMBER}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-mono">ID: {s.supplier_id || s.SUPPLIER_ID}</p>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Invoice # *</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="INV-001" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Order Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Supplier GSTIN</label>
                    <input type="text" value={supplierGST} onChange={(e) => setSupplierGST(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="27XXXXX..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Phone</label>
                    <input type="text" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Payment Method</label>
                    <div className="relative">
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition font-semibold"
                      >
                        <optgroup label="Standard">
                          <option value="CASH">💵 Cash</option>
                          <option value="UPI">📱 UPI</option>
                          <option value="CREDIT">💳 Credit</option>
                        </optgroup>
                        <optgroup label="Bank Transfer">
                          <option value="RTGS">🏦 RTGS</option>
                          <option value="NEFT">🏦 NEFT</option>
                          <option value="IMPS">🏦 IMPS</option>
                          <option value="CHEQUE">📄 Cheque</option>
                        </optgroup>
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-end flex-col justify-center">
                    <label className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition w-full group">
                      <input type="checkbox" checked={isIGST} onChange={(e) => setIsIGST(e.target.checked)} className="w-5 h-5 accent-blue-600 rounded" />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200">Inter-State (IGST)</span>
                    </label>
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Items Purchased</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                <div className="min-h-[300px] overflow-visible">
                  <div className="overflow-x-auto lg:overflow-visible">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-4 px-2">PRODUCT</th>
                          <th className="pb-4 px-2 w-24 text-center">HSN</th>
                          <th className="pb-4 px-2 w-24 text-center">QTY</th>
                          <th className="pb-4 px-2 w-40 text-right">PRICE (₹)</th>
                          <th className="pb-4 px-2 w-24 text-center">GST %</th>
                          <th className="pb-4 px-2 w-40 text-right">TOTAL (₹)</th>
                          <th className="pb-4 px-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {items.map((item, idx) => (
                          <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors relative focus-within:z-50">
                            <td className="py-2 px-2 relative min-w-[250px]">
                              <Autocomplete
                                searchEndpoint={`${API}/products`}
                                placeholder="Product name..."
                                value={item.product_name}
                                inputClassName="!py-1.5 !rounded-lg text-sm !bg-gray-50 dark:!bg-gray-900/50 border-gray-200 dark:border-gray-700 !text-gray-900 dark:!text-white"
                                onChange={(val) => {
                                  const newItems = [...items];
                                  newItems[idx].product_name = val;
                                  newItems[idx].product_id = ''; // Clear ID on change
                                  setItems(newItems);
                                }}
                                onSelect={(p) => handleSelectProduct(idx, p)}
                                labelKey="product_name"
                                valueKey="product_id"
                                className="!bg-transparent"
                                renderItem={(p, query) => (
                                  <div className="flex justify-between items-center w-full">
                                    <div className="text-left">
                                      <p className="font-bold text-gray-900 dark:text-white text-sm">{p.product_name || p.PRODUCT_NAME}</p>
                                      <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">HSN: {p.hsn_code || p.HSN_CODE || 'N/A'}</span>
                                        <span className={`text-[10px] font-bold ${(p.quantity || p.QUANTITY) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>Stock: {p.quantity || p.QUANTITY || 0}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs font-black text-emerald-500">₹{parseFloat(p.purchase_price || p.PURCHASE_PRICE || 0).toLocaleString()}</p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">GST: {p.gst_rate || p.GST_RATE || 0}%</p>
                                    </div>
                                  </div>
                                )}
                              />
                            </td>
                            <td className="py-4 px-2">
                              <input type="text" value={item.hsn_code} onChange={(e) => updateItem(idx, 'hsn_code', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-center text-xs text-gray-500 dark:text-gray-400" />
                            </td>
                            <td className="py-4 px-2">
                              <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-center text-gray-900 dark:text-white" min="1" />
                            </td>
                            <td className="py-4 px-2">
                              <input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-right text-gray-900 dark:text-white" />
                            </td>
                            <td className="py-4 px-2">
                              <select value={item.gst_rate} onChange={(e) => updateItem(idx, 'gst_rate', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded px-1 py-1 text-center text-gray-900 dark:text-white outline-none">
                                {[5, 12, 18, 28].map(r => <option key={r} className="bg-white dark:bg-gray-800">{r}</option>)}
                              </select>
                            </td>
                            <td className="py-4 px-2 text-right font-bold text-gray-900 dark:text-white">
                              ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 + (parseFloat(item.gst_rate) || 0) / 100)).toFixed(2)}
                            </td>
                            <td className="py-4 px-2 text-right">
                              <button type="button" onClick={() => removeItem(idx)} className="p-2 text-gray-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Notes / Remarks</h3>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none transition" placeholder="Any specific instructions..." />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 shadow-lg ring-1 ring-black/5 dark:ring-white/5">
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400 font-medium">Net Value</span> <span className="text-gray-900 dark:text-white font-bold">₹{totals.taxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    {isIGST ? (
                      <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400 font-medium">IGST</span> <span className="text-yellow-600 dark:text-yellow-500 font-bold">+₹{totals.igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400 font-medium">CGST</span> <span className="text-gray-700 dark:text-gray-300 font-bold">+₹{totals.cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400 font-medium">SGST</span> <span className="text-gray-700 dark:text-gray-300 font-bold">+₹{totals.sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                      </>
                    )}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Grand Total</span>
                      <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-500">₹{totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {loading ? <Loader className="animate-spin" /> : <Save size={20} />}
                    {loading ? 'Processing...' : 'Confirm Order'}
                  </button>
                </div>
              </section>
            </form>
          </div>
        )}

        {/* --- RETURN VIEW --- */}
        {view === 'return' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {savedReturn && (
              <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500 rounded-full"><RotateCcw size={20} className="text-white" /></div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Return Processed Successfully</h3>
                    <p className="text-rose-200/60 font-mono text-sm">Ref: {savedReturn.return_id}</p>
                  </div>
                </div>
                <button onClick={() => setSavedReturn(null)} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition">Done</button>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2 font-mono">
                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span> Search Original Purchase
              </h2>
              <div className="flex gap-4 max-w-xl">
                <input
                  type="text" value={returnInvoiceRef} onChange={(e) => setReturnInvoiceRef(e.target.value)}
                  placeholder="Search by Invoice #, Supplier Name or Phone..."
                  className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition"
                />
                <button onClick={() => handleReturnLookup()} disabled={returnLookupLoading || !returnInvoiceRef.trim()} className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-rose-600/20">
                  {returnLookupLoading ? <Loader className="animate-spin" /> : <Search size={18} />} Search
                </button>
              </div>

              {returnSearchResults.length > 0 && (
                <div className="mt-8 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-4 bg-gray-100/50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Matching Purchase Records</h4>
                    <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold">{returnSearchResults.length} found</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-64 overflow-y-auto">
                    {returnSearchResults.map((res) => (
                      <button
                        key={res.PURCHASE_ID || res.purchase_id}
                        onClick={() => handleReturnLookup(res.PURCHASE_ID || res.purchase_id)}
                        className="w-full text-left p-5 hover:bg-rose-50 dark:hover:bg-rose-900/10 flex items-center justify-between group transition-all"
                      >
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl group-hover:bg-rose-50 dark:group-hover:bg-rose-500/20 transition-colors shadow-sm">
                              <FileText size={18} className="text-gray-400 group-hover:text-rose-500" />
                           </div>
                           <div>
                              <div className="flex items-center gap-3">
                                 <span className="font-mono text-gray-900 dark:text-white font-bold">{res.invoice_number || res.INVOICE_NUMBER}</span>
                                 <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tighter">{new Date(res.invoice_date || res.INVOICE_DATE).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                 {res.PHONE_NUMBER && <span className="text-[10px] text-gray-450 dark:text-gray-500 flex items-center gap-1 font-mono"><Phone size={10} /> {res.PHONE_NUMBER}</span>}
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-sm font-black text-gray-900 dark:text-white">₹{parseFloat(res.TOTAL_AMOUNT || 0).toLocaleString()}</p>
                              <p className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md mt-1 ${res.STATUS === 'PARTIALLY_RETURNED' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-500' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                 {res.STATUS || 'COMPLETED'}
                              </p>
                           </div>
                           <ArrowRight size={18} className="text-gray-300 dark:text-gray-700 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {returnLookupError && <p className="text-rose-400 mt-4 text-sm font-medium flex items-center gap-2"><AlertCircle size={14} /> {returnLookupError}</p>}
            </div>

            {returnInvoiceData && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between mb-8 pb-8 border-b border-gray-100 dark:border-gray-700 gap-6">
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Purchase Details</p>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{returnInvoiceData.INVOICE_NUMBER}</h3>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{new Date(returnInvoiceData.INVOICE_DATE).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Supplier</p>
                      <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-500">{returnInvoiceData.SUPPLIER_NAME}</h3>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">GST: {returnInvoiceData.GST_NUMBER || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 mb-8">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">
                          <th className="py-4 px-6">Product Item</th>
                          <th className="py-4 px-6 text-center">Original</th>
                          <th className="py-4 px-6 text-center">Returned</th>
                          <th className="py-4 px-6 text-center">Available</th>
                          <th className="py-4 px-6 w-40 text-center">Returning</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {returnItems.map(item => (
                          <tr key={item.PRODUCT_ID} className="group hover:bg-gray-50 dark:hover:bg-gray-700/10 transition-colors">
                            <td className="py-5 px-6">
                              <p className="font-bold text-gray-900 dark:text-white">{item.PRODUCT_NAME}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">HSN: {item.HSN_CODE || 'N/A'}</p>
                            </td>
                            <td className="py-5 px-6 text-center text-gray-500 dark:text-gray-400 font-bold">{item.QTY_PURCHASED}</td>
                            <td className="py-5 px-6 text-center text-rose-500 font-bold">{item.RETURNED_QTY}</td>
                            <td className="py-5 px-6 text-center text-emerald-500 font-bold">{item.qty_returnable}</td>
                            <td className="py-5 px-6">
                              <input
                                type="number" min="0" max={item.qty_returnable} value={item.return_qty || ''}
                                onChange={(e) => {
                                  const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.qty_returnable);
                                  setReturnItems(prev => prev.map(it => it.PRODUCT_ID === item.PRODUCT_ID ? { ...it, return_qty: val } : it));
                                }}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none transition"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                       <div className="flex justify-between items-center mb-3">
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Reason for Return *</label>
                          {!returnNotes.trim() && <span className="text-[10px] text-rose-500 font-bold animate-pulse">Required for processing</span>}
                       </div>
                       <textarea 
                          value={returnNotes} 
                          onChange={(e) => setReturnNotes(e.target.value)} 
                          className={`w-full bg-gray-50 dark:bg-gray-900/50 border ${!returnNotes.trim() ? 'border-rose-300 dark:border-rose-900' : 'border-gray-200 dark:border-gray-700'} rounded-xl p-4 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 h-32 resize-none transition`}
                          placeholder="e.g. Damaged products, incorrect quantity, expired items..." 
                       />
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-8 shadow-sm">
                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-sm">
                           <span className="text-gray-500 dark:text-gray-400 font-medium">Selected Refund</span> 
                           <span className="text-gray-900 dark:text-white font-bold">₹{returnItems.reduce((acc, i) => acc + (Number(i.return_qty || 0) * Number(i.UNIT_PRICE || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-gray-500 dark:text-gray-400 font-medium">Tax Refund (GST)</span> 
                           <span className="text-gray-900 dark:text-white font-bold">₹{returnItems.reduce((acc, i) => acc + (Number(i.return_qty || 0) * Number(i.UNIT_PRICE || 0) * Number(i.GST_RATE || 0) / 100), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pt-4 border-t border-rose-100 dark:border-rose-900/50 flex justify-between items-center">
                          <span className="text-gray-900 dark:text-white font-extrabold uppercase text-xs tracking-tighter">Total Refund Value</span>
                          <div className="text-right">
                             <span className="text-3xl font-black text-rose-600 dark:text-rose-500">₹{returnItems.reduce((acc, i) => {
                               const qty = Number(i.return_qty || 0);
                               const price = Number(i.UNIT_PRICE || 0);
                               const gst = Number(i.GST_RATE || 0);
                               const taxable = qty * price;
                               const taxAmt = (taxable * gst) / 100;
                               return acc + taxable + taxAmt;
                             }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                             <p className="text-[10px] text-rose-400 dark:text-rose-300/50 font-bold mt-1">INC. ALL TAXES</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={handleSaveReturn} 
                        disabled={loading || !returnItems.some(i => i.return_qty > 0) || !returnNotes.trim()} 
                        className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-xl shadow-rose-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
                      >
                        {loading ? <Loader className="animate-spin" /> : <Save size={20} className="group-hover:scale-110 transition-transform" />} 
                        {loading ? 'Processing...' : 'Process Refund'}
                      </button>
                      {!returnItems.some(i => i.return_qty > 0) && <p className="text-[10px] text-center text-rose-600 dark:text-rose-400/60 mt-3 font-bold uppercase tracking-widest">Select items to return</p>}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* --- HISTORY VIEW --- */}
        {view === 'history' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 w-fit shadow-sm">
              <button onClick={() => setShowHistoryType('purchases')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${showHistoryType === 'purchases' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}>Purchase Orders</button>
              <button onClick={() => setShowHistoryType('returns')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${showHistoryType === 'returns' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}>Processed Returns</button>
            </div>

            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                <Loader className="animate-spin w-12 h-12 mb-4 text-blue-500" />
                <p className="font-bold uppercase tracking-widest text-xs">Fetching Records...</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">
                        <th className="py-5 px-8">No.</th>
                        <th className="py-5 px-8">Supplier</th>
                        <th className="py-5 px-8 text-center">Date</th>
                        <th className="py-5 px-8 text-right">Value (₹)</th>
                        {showHistoryType === 'purchases' && <th className="py-5 px-8 text-center">Payment</th>}
                        {showHistoryType === 'returns' && <th className="py-5 px-8">Original Inv</th>}
                        <th className="py-5 px-8 text-center">Status</th>
                        <th className="py-5 px-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {(showHistoryType === 'purchases' ? historyPurchases : historyReturns).map((item, idx) => (
                        <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                          <td className="py-6 px-8 font-bold text-gray-900 dark:text-white font-mono">{showHistoryType === 'purchases' ? item.INVOICE_NUMBER : item.RETURN_NUMBER || item.RETURN_ID}</td>
                          <td className="py-6 px-8">
                            <p className="font-bold text-gray-900 dark:text-white">{item.SUPPLIER_NAME}</p>
                          </td>
                          <td className="py-6 px-8 text-center text-gray-500 dark:text-gray-400">{new Date(showHistoryType === 'purchases' ? (item.CREATED_AT || item.INVOICE_DATE) : (item.RETURN_DATE || item.CREATED_AT)).toLocaleDateString()}</td>
                          <td className="py-6 px-8 text-right font-black text-gray-900 dark:text-white">₹{parseFloat(showHistoryType === 'purchases' ? (item.TOTAL_AMOUNT || 0) : (item.TOTAL_REFUND || item.TOTAL_AMOUNT || 0)).toLocaleString()}</td>
                          {showHistoryType === 'purchases' && (
                            <td className="py-6 px-8 text-center">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                                item.PAYMENT_METHOD === 'CASH' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                item.PAYMENT_METHOD === 'UPI' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                                item.PAYMENT_METHOD === 'CREDIT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                              }`}>{item.PAYMENT_METHOD || 'CASH'}</span>
                            </td>
                          )}
                          {showHistoryType === 'returns' && <td className="py-6 px-8 font-mono text-xs text-blue-600 dark:text-blue-400">{item.ORIGINAL_INVOICE}</td>}
                          <td className="py-6 px-8 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.STATUS === 'RETURNED' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'}`}>
                              {item.STATUS || 'COMPLETED'}
                            </span>
                          </td>
                          <td className="py-6 px-8 text-right">
                            <button onClick={() => viewTransactionDetails(showHistoryType === 'purchases' ? item.PURCHASE_ID : item.RETURN_ID, showHistoryType === 'purchases' ? 'purchase' : 'return')} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-600 transition shadow-sm group-hover:scale-110">
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- DETAIL MODAL --- */}
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 dark:bg-gray-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/20">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${selectedTransaction?.type === 'purchase' ? 'bg-blue-600' : 'bg-rose-600'} shadow-lg shadow-current/20`}>
                    {selectedTransaction?.type === 'purchase' ? <ShoppingCart className="text-white" /> : <RotateCcw className="text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">{selectedTransaction?.type === 'purchase' ? 'Purchase Order' : 'Inventory Return'}</p>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{selectedTransaction?.INVOICE_NUMBER || selectedTransaction?.RETURN_NUMBER || selectedTransaction?.RETURN_ID}</h2>
                  </div>
                </div>
                <button onClick={() => { setIsDetailModalOpen(false); setSelectedTransaction(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition"><X /></button>
              </header>

              <div className="flex-1 overflow-y-auto p-8">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader className="animate-spin w-10 h-10 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Loading Details...</p>
                  </div>
                ) : selectedTransaction && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-tighter font-black text-[10px]"><User size={14} /> <span>Supplier</span></div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedTransaction.SUPPLIER_NAME}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">{selectedTransaction.SUPPLIER_GST || 'No GSTIN Provided'}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-tighter font-black text-[10px]"><Calendar size={14} /> <span>Transaction Date</span></div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{new Date(selectedTransaction.INVOICE_DATE || selectedTransaction.CREATED_AT).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-tighter font-black text-[10px]"><FileText size={14} /> <span>Tax Configuration</span></div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedTransaction.IS_IGST ? 'IGST (Inter-State)' : 'CGST + SGST (Intra-State)'}</p>
                      </div>
                      {selectedTransaction.type === 'purchase' && selectedTransaction.PAYMENT_METHOD && (
                        <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-tighter font-black text-[10px]"><Tag size={14} /> <span>Payment Method</span></div>
                          <p className={`font-black text-lg ${
                            selectedTransaction.PAYMENT_METHOD === 'CASH' ? 'text-emerald-600 dark:text-emerald-400' :
                            selectedTransaction.PAYMENT_METHOD === 'UPI' ? 'text-purple-600 dark:text-purple-400' :
                            selectedTransaction.PAYMENT_METHOD === 'CREDIT' ? 'text-amber-600 dark:text-amber-400' :
                            'text-blue-600 dark:text-blue-400'
                          }`}>{selectedTransaction.PAYMENT_METHOD}</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm bg-gray-50 dark:bg-gray-950/20">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-100/80 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                              <th className="py-4 px-6 text-center">#</th>
                              <th className="py-4 px-6">Product Details</th>
                              <th className="py-4 px-6 text-center">HSN</th>
                              <th className="py-4 px-6 text-center">Qty</th>
                              <th className="py-4 px-6 text-right">Unit Price</th>
                              <th className="py-4 px-6 text-right">Tax Value</th>
                              <th className="py-4 px-6 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                            {selectedTransaction.items?.map((item, i) => (
                              <tr key={i} className="hover:bg-white dark:hover:bg-gray-800/30 transition-colors">
                                <td className="py-4 px-6 text-center text-gray-400 dark:text-gray-600 font-mono text-xs">{i + 1}</td>
                                <td className="py-4 px-6">
                                  <p className="font-bold text-gray-900 dark:text-white">{item.PRODUCT_NAME}</p>
                                </td>
                                <td className="py-4 px-6 text-center text-gray-500 dark:text-gray-400 font-mono text-xs">{item.HSN_CODE || '-'}</td>
                                <td className="py-4 px-6 text-center font-bold text-gray-900 dark:text-white">{item.QUANTITY}</td>
                                <td className="py-4 px-6 text-right text-gray-500 dark:text-gray-400 font-mono">₹{parseFloat(item.UNIT_PRICE || 0).toFixed(2)}</td>
                                <td className="py-4 px-6 text-right text-gray-500 dark:text-gray-400 font-mono">₹{parseFloat((item.CGST_AMOUNT || 0) + (item.SGST_AMOUNT || 0) + (item.IGST_AMOUNT || 0)).toFixed(2)}</td>
                                <td className="py-4 px-6 text-right font-black text-gray-900 dark:text-white">₹{parseFloat(item.TOTAL_AMOUNT || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-gray-50 dark:bg-gray-800/20 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-3 tracking-widest">Transaction Notes</p>
                        <p className="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed font-medium">"{selectedTransaction.NOTES || 'No special notes recorded for this transaction.'}"</p>
                      </div>
                      <div className="bg-blue-600/5 dark:bg-blue-600/5 border border-blue-100 dark:border-blue-500/20 p-6 rounded-2xl flex flex-col justify-center shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 dark:border-white/5">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Financial Summary</span>
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase">INR</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tighter">Gross Asset Value</span>
                          <span className="text-3xl font-black text-blue-600 dark:text-blue-500">₹{selectedTransaction.items?.reduce((acc, i) => acc + parseFloat(i.TOTAL_AMOUNT || 0), 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchase;
