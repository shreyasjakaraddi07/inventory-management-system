import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Search, Plus, Download, Edit, Trash2, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const API = 'http://localhost:8080/api';

const defaultProduct = {
  product_name: '', sku: '', category: '', quantity: '', supplier: '',
  costPrice: '', sellingPrice: '', hsnCode: '', gstRate: 18, minStock: ''
};

const Inventory = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(defaultProduct);
  const [isEditing, setIsEditing] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockMode, setStockMode] = useState('add');
  const [stockValue, setStockValue] = useState('');
  const [adjustingStock, setAdjustingStock] = useState(false);

  const getConfig = () => {
    if (!user?.token) {
      setError('No authentication token. Please login again.');
      return null;
    }
    return { headers: { Authorization: `Bearer ${user?.token}` } };
  };

  const fetchProducts = async () => {
    try {
      setError(null);
      setLoading(true);
      const config = getConfig();
      if (!config) {
        setLoading(false);
        return;
      }
      const url = `${API}/products?keyword=${keyword}&category=${category}`;
      const { data } = await axios.get(url, config);
      
      // Map Oracle uppercase fields to frontend expected fields
      const mappedProducts = (data.data || []).map(p => ({
        product_id: p.PRODUCT_ID,
        product_name: p.PRODUCT_NAME,
        sku: p.SKU || '', // Not in DB yet
        category: p.CATEGORY || 'General', // Not in DB yet
        quantity: p.QUANTITY || 0,
        supplier: p.SUPPLIER_NAME || 'Unknown',
        costPrice: p.PURCHASE_PRICE || 0,
        sellingPrice: p.SALE_PRICE || 0,
        hsnCode: p.HSN_CODE || '',
        gstRate: p.GST_RATE || 18,
        minStock: p.MIN_STOCK || 10 // Not in DB yet
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products', error);
      setError(error.response?.data?.message || error.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [keyword, category]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(products.map(p => ({
      'Product Name': p.product_name, 'SKU': p.sku, 'Category': p.category,
      'Stock Qty': p.quantity, 'Min Stock': p.minStock, 'Status': p.quantity === 0 ? 'OUT OF STOCK' : p.quantity <= p.minStock ? 'LOW STOCK' : 'OK',
      'Cost Price': p.costPrice, 'Selling Price': p.sellingPrice, 'HSN Code': p.hsnCode, 'GST Rate %': p.gstRate
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "inventory_export.xlsx");
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product? This cannot be undone.')) {
      try {
        await axios.delete(`${API}/products/${id}`, getConfig());
        fetchProducts();
      } catch (error) { console.error(error); }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Map frontend camelCase fields to backend snake_case fields
      const payload = {
        product_name: currentProduct.product_name,
        hsn_code: currentProduct.hsnCode || currentProduct.hsn_code || '',
        purchase_price: parseFloat(currentProduct.costPrice) || 0,
        sale_price: parseFloat(currentProduct.sellingPrice) || 0,
        gst_rate: parseFloat(currentProduct.gstRate) || 18,
        supplier_id: currentProduct.supplier_id || null,
      };
      if (isEditing) {
        await axios.put(`${API}/products/${currentProduct.product_id}`, payload, getConfig());
      } else {
        await axios.post(`${API}/products`, {
          ...payload,
          quantity: parseInt(currentProduct.quantity) || 0,
        }, getConfig());
      }
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      alert(error.response?.data?.message || error.response?.data?.error || 'Error saving product');
    }
  };

  const openModal = (product = null) => {
    setCurrentProduct(product ? { ...product } : { ...defaultProduct });
    setIsEditing(!!product);
    setShowModal(true);
  };

  const openStockModal = (product) => {
    setStockProduct(product);
    setStockMode('add');
    setStockValue('');
    setShowStockModal(true);
  };

  const closeStockModal = () => {
    setShowStockModal(false);
    setStockProduct(null);
    setStockMode('add');
    setStockValue('');
    setAdjustingStock(false);
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!stockProduct) return;

    const numericValue = Number(stockValue);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      alert('Enter a valid stock value');
      return;
    }

    const adjustment = stockMode === 'remove' ? -numericValue : numericValue;
    const payload = {
      mode: stockMode === 'set' ? 'set' : 'adjust',
      adjustment
    };

    try {
      setAdjustingStock(true);
      await axios.patch(`${API}/products/${stockProduct.product_id}/stock`, payload, getConfig());
      await fetchProducts();
      closeStockModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating stock');
      setAdjustingStock(false);
    }
  };

  const getStatusBadge = (product) => {
    if (product.quantity === 0) return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle size={11} />Out of Stock</span>;
    if (product.quantity <= (product.minStock || 10)) return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertTriangle size={11} />Low Stock</span>;
    return <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle size={11} />OK</span>;
  };

  const lowStockCount = products.filter(p => p.quantity <= (p.minStock || 10) && p.quantity > 0).length;
  const outOfStockCount = products.filter(p => p.quantity === 0).length;

  if (loading) return <div className="p-8 text-center text-gray-500">Loading inventory...</div>;
  
  if (!user?.token) return <div className="p-8 text-center text-red-500"><strong>Error:</strong> Authentication token missing. Please login again.</div>;
  
  if (error) return <div className="p-8"><div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300"><strong>Error:</strong> {error}</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Package className="text-indigo-500" />Stock / Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage products, track stock levels, and monitor low-stock alerts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm shadow-sm">
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
          {user?.role === 'Admin' && (
            <button onClick={() => openModal()} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {outOfStockCount > 0 && <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300"><AlertTriangle size={16} /><strong>{outOfStockCount}</strong> items are out of stock!</div>}
          {lowStockCount > 0 && <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm text-yellow-700 dark:text-yellow-300"><AlertTriangle size={16} /><strong>{lowStockCount}</strong> items are running low on stock.</div>}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search products by name or SKU..." value={keyword} onChange={e => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="w-full sm:w-48 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Furniture">Furniture</option>
          <option value="Clothing">Clothing</option>
          <option value="Food">Food</option>
          <option value="Chemicals">Chemicals</option>
          <option value="Accessories">Accessories</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Product Name</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase">HSN</th>
                <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Stock Qty</th>
                <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Min Level</th>
                <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Cost ₹</th>
                <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase">MRP ₹</th>
                <th className="px-5 py-4 text-center text-xs font-semibold text-gray-500 uppercase">GST%</th>
                {user?.role === 'Admin' && <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {products.length === 0 ? (
                <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No products found. Add your first product!</td></tr>
              ) : (
                products.map(product => (
                  <tr key={product.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center text-indigo-600">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{product.product_name}</div>
                          <div className="text-xs text-gray-500">{product.supplier}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{product.sku}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{product.category}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">{product.hsnCode || '-'}</td>
                    <td className="px-5 py-4 text-center font-bold text-gray-900 dark:text-white">{product.quantity}</td>
                    <td className="px-5 py-4 text-center text-gray-500">{product.minStock || 10}</td>
                    <td className="px-5 py-4 text-center">{getStatusBadge(product)}</td>
                    <td className="px-5 py-4 text-right font-mono text-gray-600 dark:text-gray-400">₹{product.costPrice?.toFixed(2)}</td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-gray-900 dark:text-white">₹{product.sellingPrice?.toFixed(2)}</td>
                    <td className="px-5 py-4 text-center"><span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{product.gstRate}%</span></td>
                    {user?.role === 'Admin' && (
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => openStockModal(product)} className="text-emerald-500 hover:text-emerald-700 mr-3 transition text-xs font-semibold">
                          Stock
                        </button>
                        <button onClick={() => openModal(product)} className="text-indigo-500 hover:text-indigo-700 mr-3 transition"><Edit className="w-4 h-4 inline" /></button>
                        <button onClick={() => handleDelete(product.product_id)} className="text-red-500 hover:text-red-700 transition"><Trash2 className="w-4 h-4 inline" /></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Product' : 'Add New Product'}</h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product Name *</label>
                    <input required value={currentProduct.product_name} onChange={e => setCurrentProduct({ ...currentProduct, product_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SKU *</label>
                    <input required value={currentProduct.sku} onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category *</label>
                    <select required value={currentProduct.category} onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                      <option value="">Select Category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Food">Food</option>
                      <option value="Chemicals">Chemicals</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Supplier</label>
                    <input value={currentProduct.supplier || ''} onChange={e => setCurrentProduct({ ...currentProduct, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <div>
                    <label className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Opening Stock</label>
                    <input type="number" min="0" value={currentProduct.quantity} onChange={e => setCurrentProduct({ ...currentProduct, quantity: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Min Stock Level</label>
                    <input type="number" min="0" value={currentProduct.minStock} onChange={e => setCurrentProduct({ ...currentProduct, minStock: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                  <div></div>
                </div>

                {/* Pricing & Tax */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h4 className="text-xs font-semibold uppercase text-gray-500 mb-3">Pricing & Tax (GST) Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cost Price (₹) *</label>
                      <input type="number" step="0.01" min="0" required value={currentProduct.costPrice} onChange={e => setCurrentProduct({ ...currentProduct, costPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Selling Price / MRP (₹) *</label>
                      <input type="number" step="0.01" min="0" required value={currentProduct.sellingPrice} onChange={e => setCurrentProduct({ ...currentProduct, sellingPrice: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">HSN Code</label>
                      <input value={currentProduct.hsnCode || ''} onChange={e => setCurrentProduct({ ...currentProduct, hsnCode: e.target.value })} placeholder="e.g. 8471"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">GST Rate</label>
                      <select value={currentProduct.gstRate} onChange={e => setCurrentProduct({ ...currentProduct, gstRate: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="0">0% (Exempt)</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockModal && stockProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Stock Adjustment</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stockProduct.product_name}</p>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="p-6 space-y-4">
                <div className="rounded-xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-400 font-semibold">Current Stock</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stockProduct.quantity}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Adjustment Mode</label>
                  <select
                    value={stockMode}
                    onChange={e => setStockMode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="add">Add Stock</option>
                    <option value="remove">Remove Stock</option>
                    <option value="set">Set Exact Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {stockMode === 'set' ? 'New Stock Quantity' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockValue}
                    onChange={e => setStockValue(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={closeStockModal} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  Cancel
                </button>
                <button type="submit" disabled={adjustingStock} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                  {adjustingStock ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
