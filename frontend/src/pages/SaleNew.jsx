import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Trash2, Save, TrendingUp, CheckCircle, AlertCircle, Loader, Info
} from 'lucide-react';
import Autocomplete from '../components/Autocomplete';

const API = 'http://localhost:8080/api';

const SaleNew = () => {
  // Form State
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerDetails, setCustomerDetails] = useState({});
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState([
    { product_id: '', product_name: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false, available_stock: 0 }
  ]);
  
  // Refs for focusing quantity fields
  const qtyRefs = useRef([]);
  
  const [products, setProducts] = useState([]);
  const [isIGST, setIsIGST] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedSale, setSavedSale] = useState(null);

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(`${API}/customers`);
        setCustomers(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch customers:', err.message);
        setError('Failed to load customers');
      }
    };
    fetchCustomers();
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

  // Handle customer selection - auto-fill details
  const handleCustomerChange = (e) => {
    const id = e.target.value;
    setCustomerId(id);
    
    const customer = customers.find(c => c.CUSTOMER_ID === parseInt(id));
    if (customer) {
      setCustomerDetails({
        name: customer.CUSTOMER_NAME,
        gst: customer.GST_NUMBER,
        phone: customer.PHONE_NUMBER,
        email: customer.EMAIL_ID,
        city: customer.CITY
      });
    } else {
      setCustomerDetails({});
    }
  };

  // Handle item changes
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill product details when selecting from Autocomplete
    if (field === 'selection' && value) {
      const product = value;
      newItems[index].product_id = product.PRODUCT_ID;
      newItems[index].product_name = product.PRODUCT_NAME;
      newItems[index].gst_rate = product.GST_RATE || 18;
      newItems[index].unit_price = product.SALE_PRICE || 0;
      newItems[index].available_stock = product.QUANTITY || 0;
      newItems[index].hsn_code = product.HSN_CODE || '';

      // Move focus to quantity field
      setTimeout(() => {
        if (qtyRefs.current[index]) {
          qtyRefs.current[index].focus();
          qtyRefs.current[index].select();
        }
      }, 0);
    } else if (field === 'product_name') {
      // Clear product_id if name is changed manually (unless it's a new product flow)
      if (newItems[index].product_id) {
         newItems[index].product_id = '';
      }
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false, available_stock: 0 }]);
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
    if (!customerId) return 'Please select a customer';
    if (!invoiceNumber.trim()) return 'Please enter invoice number';
    if (items.length === 0) return 'Please add at least one item';
    
    for (let item of items) {
      if (!item.product_id) return 'Please select product for all items';
      if (item.quantity <= 0) return 'Quantity must be greater than 0';
      if (item.unit_price <= 0) return 'Unit price must be greater than 0';
      if (item.quantity > (item.available_stock || 0)) {
        return `Insufficient stock for item. Available: ${item.available_stock}`;
      }
    }
    
    return null;
  };

  // Submit sale
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
      const payload = {
        customer_id: parseInt(customerId),
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

      console.log('📥 Submitting sale:', payload);
      
      const res = await axios.post(`${API}/sales`, payload);
      
      console.log('✅ Sale created:', res.data);
      
      setSuccess(`✅ Sale saved! ID: ${res.data.sale_id}`);
      setSavedSale(res.data);
      
      // Reset form
      setCustomerId('');
      setInvoiceNumber('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setItems([{ product_id: '', quantity: 1, unit_price: 0, gst_rate: 18, is_igst: false }]);
      setNotes('');
      setCustomerDetails({});
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create sale';
      console.error('❌ Sale error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-8 h-8 text-green-600" />
        <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
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
        {/* Customer Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
              <select
                value={customerId}
                onChange={handleCustomerChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.CUSTOMER_ID} value={c.CUSTOMER_ID}>
                    {c.CUSTOMER_NAME}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., SAL-2026-001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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

          {customerDetails.name && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>GST:</strong> {customerDetails.gst || '-'}</div>
                <div><strong>Phone:</strong> {customerDetails.phone || '-'}</div>
                <div><strong>Email:</strong> {customerDetails.email || '-'}</div>
                <div><strong>City:</strong> {customerDetails.city || '-'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sale Items</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Product</th>
                  <th className="text-right py-2 px-2 w-20">Stock</th>
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
                      <td className="py-3 px-2 min-w-[250px]">
                        <Autocomplete
                          placeholder="Search product or HSN..."
                          value={item.product_name}
                          onChange={(val) => updateItem(idx, 'product_name', val)}
                          onSelect={(product) => updateItem(idx, 'selection', product)}
                          searchEndpoint={`${API}/products/search`}
                          createEndpoint={`${API}/products`}
                          labelKey="PRODUCT_NAME"
                          valueKey="PRODUCT_ID"
                          renderItem={(product, query) => (
                            <div className="flex justify-between items-center w-full">
                               <div className="flex flex-col">
                                  <span className="font-bold text-gray-800">{product.PRODUCT_NAME}</span>
                                  <span className="text-[10px] text-gray-500 uppercase font-medium">HSN: {product.HSN_CODE || 'N/A'}</span>
                               </div>
                               <div className="flex flex-col items-end">
                                  <span className="text-sm font-bold text-green-600">₹{parseFloat(product.SALE_PRICE || 0).toFixed(2)}</span>
                                  <span className="text-[10px] text-gray-400 font-medium">GST: {product.GST_RATE}%</span>
                               </div>
                            </div>
                          )}
                        />
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-gray-600">
                        {item.available_stock || 0}
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          ref={el => qtyRefs.current[idx] = el}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:ring-1 focus:ring-green-500 outline-none"
                          min="0.01"
                          step="any"
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
            className="mt-4 flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-800 font-medium"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows="3"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? (
            <><Loader className="w-5 h-5 animate-spin" /> Processing...</>
          ) : (
            <><Save className="w-5 h-5" /> Save Sale</>
          )}
        </button>
      </form>
    </div>
  );
};

export default SaleNew;
