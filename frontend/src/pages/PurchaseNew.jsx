import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, Save, ShoppingCart, CheckCircle, AlertCircle, Loader, Search, Tag
} from 'lucide-react';

const API = 'http://localhost:8080/api';

const PurchaseNew = () => {
  // Form State
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
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false }
  ]);
  
  const [products, setProducts] = useState([]);
  const [isIGST, setIsIGST] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedPurchase, setSavedPurchase] = useState(null);
  
  const searchTimeoutRef = useRef(null);

  // Fetch suppliers on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axios.get(`${API}/suppliers`);
        setSuppliers(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch suppliers:', err.message);
        setError('Failed to load suppliers');
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API}/products`);
        setProducts(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch products:', err.message);
      }
    };
    fetchProducts();
  }, []);

  // Handle supplier name search
  const handleSupplierSearch = (value) => {
    setSupplierName(value);
    setShowSearchResults(true);
    setIsNewSupplier(false);
    setSupplierId('');
    setError(''); // Clear error when typing supplier name
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔍 Searching suppliers for:', value);
        const res = await axios.get(`${API}/suppliers/search?q=${encodeURIComponent(value)}`);
        console.log('✅ Search results:', res.data.data?.length || 0);
        setSearchResults(res.data.data || []);
      } catch (err) {
        console.error('❌ Search failed:', err.message);
        setSearchResults([]);
      }
    }, 300);
  };

  // Handle selecting an existing supplier
  const handleSelectSupplier = (supplier) => {
    setSupplierId(supplier.SUPPLIER_ID);
    setSupplierName(supplier.SUPPLIER_NAME);
    setSupplierGST(supplier.GST_NUMBER || '');
    setSupplierPhone(supplier.PHONE_NUMBER || '');
    setSupplierEmail(supplier.EMAIL_ID || '');
    setSelectedSupplier(supplier);
    setIsNewSupplier(false);
    setShowSearchResults(false);
  };

  // Create new supplier when typing new name
  const handleCreateNewSupplier = (name) => {
    setSupplierName(name);
    setSupplierId('');
    setSelectedSupplier(null);
    setIsNewSupplier(true);
    setShowSearchResults(false);
  };

  // Handle item changes
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill product details
    if (field === 'product_id' && value) {
      const product = products.find(p => p.PRODUCT_ID === parseInt(value));
      if (product) {
        newItems[index].gst_rate = product.GST_RATE || 18;
        newItems[index].unit_price = product.PURCHASE_PRICE || 0;
      }
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0;
    
    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const gst = parseFloat(item.gst_rate) || 0;
      
      const taxable = qty * price;
      totalTaxable += taxable;
      
      if (isIGST || item.is_igst) {
        totalIGST += (taxable * gst) / 100;
      } else {
        const halfGST = (taxable * gst) / 200;
        totalCGST += halfGST;
        totalSGST += halfGST;
      }
    });
    
    return {
      taxable: totalTaxable,
      cgst: totalCGST,
      sgst: totalSGST,
      igst: totalIGST,
      total: totalTaxable + totalCGST + totalSGST + totalIGST
    };
  };

  // Validate form
  const validateForm = () => {
    if (!supplierName.trim()) return 'Please enter a supplier name';
    if (!invoiceNumber.trim()) return 'Please enter invoice number';
    if (items.length === 0) return 'Please add at least one item';
    
    for (let item of items) {
      if (!item.product_id) return 'Please select product for all items';
      if (item.quantity <= 0) return 'Quantity must be greater than 0';
      if (item.unit_price <= 0) return 'Unit price must be greater than 0';
    }
    
    return null;
  };

  // Create or get supplier, then create purchase
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let finalSupplierId = supplierId;

      // If it's a new supplier or unmatched supplier, create it first
      if (!finalSupplierId || isNewSupplier) {
        console.log('🆕 Creating new supplier:', supplierName);
        try {
          const supplierRes = await axios.post(`${API}/suppliers`, {
            supplier_name: supplierName.trim(),
            gst_number: supplierGST || null,
            phone_number: supplierPhone || null,
            email_id: supplierEmail || null
          });

          const createdSupplier = supplierRes.data.data;
          finalSupplierId = createdSupplier.SUPPLIER_ID;
          
          if (!finalSupplierId) {
            throw new Error('No supplier ID returned from server');
          }
          
          if (supplierRes.data.isNew) {
            console.log('✅ New supplier created:', finalSupplierId);
            setSuccess(`✅ New supplier '${supplierName}' created successfully`);
          } else {
            console.log('✅ Using existing supplier:', finalSupplierId);
          }
        } catch (supplierError) {
          const errorMsg = supplierError.response?.data?.details || supplierError.message || 'Failed to create supplier';
          console.error('❌ Supplier creation failed:', errorMsg);
          setError(`Failed to create supplier: ${errorMsg}`);
          setLoading(false);
          return;
        }
      }

      // Now create the purchase
      const payload = {
        supplier_id: finalSupplierId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        items: items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          gst_rate: parseFloat(item.gst_rate),
          is_igst: isIGST || item.is_igst
        })),
        is_igst: isIGST ? 1 : 0,
        notes: notes
      };

      console.log('📥 Submitting purchase:', payload);
      
      const res = await axios.post(`${API}/purchases`, payload);
      
      console.log('✅ Purchase created:', res.data);
      
      setSuccess(`✅ Purchase saved! ID: ${res.data.purchase_id}`);
      setSavedPurchase(res.data);
      
      // Reset form
      setSupplierId('');
      setSupplierName('');
      setSupplierGST('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSelectedSupplier(null);
      setIsNewSupplier(false);
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setItems([{ product_id: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false }]);
      setNotes('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create purchase';
      console.error('❌ Purchase error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">New Purchase</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Supplier Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Supplier Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name *
                {isNewSupplier && (
                  <span className="ml-2 inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    <Tag className="inline w-3 h-3 mr-1" />
                    New Supplier
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => handleSupplierSearch(e.target.value)}
                  onFocus={() => {
                    if (supplierName) {
                      setShowSearchResults(true);
                    }
                  }}
                  onBlur={() => {
                    // Keep dropdown open for a moment to allow clicking on options
                    setTimeout(() => {
                      if (!supplierId && !isNewSupplier) {
                        setShowSearchResults(false);
                      }
                    }, 150);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type supplier name or select from list..."
                  autoComplete="off"
                />
                <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                
                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <>
                        {searchResults.map(supplier => (
                          <div
                            key={supplier.SUPPLIER_ID}
                            onClick={() => handleSelectSupplier(supplier)}
                            className="px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-blue-50 transition"
                          >
                            <div className="font-medium text-gray-900">{supplier.SUPPLIER_NAME}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {supplier.GST_NUMBER && <>GST: {supplier.GST_NUMBER}</> }
                              {supplier.PHONE_NUMBER && <> | Phone: {supplier.PHONE_NUMBER}</>}
                            </div>
                          </div>
                        ))}
                        
                        {supplierName.trim() && !searchResults.some(s => s.SUPPLIER_NAME.toLowerCase() === supplierName.toLowerCase()) && (
                          <div
                            onClick={() => handleCreateNewSupplier(supplierName)}
                            className="px-4 py-3 text-blue-600 hover:bg-blue-50 cursor-pointer font-medium border-t border-gray-200"
                          >
                            <span className="inline-block mr-2">➕</span>
                            Create new supplier: <strong>{supplierName}</strong>
                          </div>
                        )}
                      </>
                    ) : supplierName.trim() ? (
                      <div
                        onClick={() => handleCreateNewSupplier(supplierName)}
                        className="px-4 py-3 text-blue-600 hover:bg-blue-50 cursor-pointer font-medium"
                      >
                        <span className="inline-block mr-2">➕</span>
                        Create new supplier: <strong>{supplierName}</strong>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No suppliers found. Start typing to search or create new...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., INV-2026-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={isIGST}
                  onChange={(e) => setIsIGST(e.target.checked)}
                  className="mr-2"
                />
                Interstate (IGST)
              </label>
            </div>
          </div>

          {/* Supplier Details Box */}
          {isNewSupplier && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">New Supplier Details (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                  <input
                    type="text"
                    value={supplierGST}
                    onChange={(e) => setSupplierGST(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 29ABCDE1234F1Z5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., +91 98765 43210"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., contact@supplier.com"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">These details will be saved with the new supplier</p>
            </div>
          )}

          {selectedSupplier && !isNewSupplier && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>GST:</strong> {selectedSupplier.GST_NUMBER || '-'}</div>
                <div><strong>Phone:</strong> {selectedSupplier.PHONE_NUMBER || '-'}</div>
                <div><strong>Email:</strong> {selectedSupplier.EMAIL_ID || '-'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Purchase Items</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Product</th>
                  <th className="text-right py-2 px-2 w-20">Qty</th>
                  <th className="text-right py-2 px-2 w-24">Unit Price</th>
                  <th className="text-right py-2 px-2 w-16">GST %</th>
                  <th className="text-right py-2 px-2 w-24">Amount</th>
                  <th className="text-center py-2 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const taxable = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                  const gst = (taxable * (parseFloat(item.gst_rate) || 0)) / 100;
                  const total = taxable + gst;

                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          required
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.PRODUCT_ID} value={p.PRODUCT_ID}>
                              {p.PRODUCT_NAME} ({p.HSN_CODE || 'N/A'})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          min="1"
                          required
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          step="0.01"
                          min="0"
                          required
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          value={item.gst_rate}
                          onChange={(e) => updateItem(idx, 'gst_rate', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          step="0.5"
                          min="0"
                        />
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">
                        ₹{total.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Totals Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Taxable Amount</div>
              <div className="text-2xl font-bold text-gray-900">₹{totals.taxable.toFixed(2)}</div>
            </div>
            
            {isIGST ? (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm text-gray-600">IGST</div>
                <div className="text-2xl font-bold text-yellow-600">₹{totals.igst.toFixed(2)}</div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">CGST</div>
                  <div className="text-2xl font-bold text-blue-600">₹{totals.cgst.toFixed(2)}</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">SGST</div>
                  <div className="text-2xl font-bold text-blue-600">₹{totals.sgst.toFixed(2)}</div>
                </div>
              </>
            )}
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-2xl font-bold text-green-600">₹{totals.total.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? (
            <><Loader className="w-5 h-5 animate-spin" /> Processing...</>
          ) : (
            <><Save className="w-5 h-5" /> Save Purchase</>
          )}
        </button>
      </form>
    </div>
  );
};

export default PurchaseNew;
