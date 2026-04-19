import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { ArrowUpRight, ArrowDownLeft, Plus, Calculator, FileText, Tag, IndianRupee } from 'lucide-react';

const Transactions = () => {
  const { user } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Transaction State
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState('SALE');
  const [customerOrSupplierName, setCustomerOrSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [isIGST, setIsIGST] = useState(false);
  
  // Cart for the transaction
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const fetchData = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      
      const [txRes, prodRes] = await Promise.all([
        axios.get('http://localhost:8080/api/transactions', config),
        axios.get('http://localhost:8080/api/products', config)
      ]);
      
      setTransactions(txRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = () => {
    if (!selectedProductId) return;
    
    // Check if already in cart
    if (cart.find(item => item.product === selectedProductId)) return;

    const dbProduct = products.find(p => p._id === selectedProductId);
    if (!dbProduct) return;

    setCart([...cart, {
      product: dbProduct._id,
      productName: dbProduct.product_name,
      quantity: parseInt(selectedQuantity) || 1,
      unitPrice: type === 'SALE' ? dbProduct.sellingPrice : dbProduct.costPrice,
      gstRate: dbProduct.gstRate
    }]);

    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product !== productId));
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Please add at least one product');

    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = { headers: { Authorization: `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' } };
      
      const payload = {
        type, customerOrSupplierName, notes, isIGST,
        products: cart.map(item => ({ product: item.product, quantity: item.quantity }))
      };

      await axios.post('http://localhost:8080/api/transactions', payload, config);
      
      setShowModal(false);
      setCart([]);
      setCustomerOrSupplierName('');
      setNotes('');
      fetchData(); // Refresh history and stock
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Transaction failed');
    }
  };

  // Live Calculation for Cart Preview
  const cartTotals = cart.reduce((acc, item) => {
    const taxable = item.unitPrice * item.quantity;
    const tax = (taxable * (item.gstRate || 0)) / 100;
    acc.subtotal += taxable;
    acc.tax += tax;
    acc.total += (taxable + tax);
    return acc;
  }, { subtotal: 0, tax: 0, total: 0 });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading transactions...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="text-primary-500" /> Transactions & Invoicing
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Record sales, purchases, and calculate GST.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl shadow-md hover:bg-primary-700 transition font-medium">
          <Plus className="w-5 h-5 mr-1" /> New Transaction
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Invoice</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type / Party</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Base Value</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">GST Impact</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map(tx => (
              <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'SALE' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {tx.type === 'SALE' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{tx.invoiceNumber}</div>
                      <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${tx.type === 'SALE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {tx.type}
                  </span>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{tx.customerOrSupplierName}</div>
                </td>
                <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-300">
                  ₹{tx.totalSubtotal.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-gray-900 dark:text-gray-300">₹{tx.totalTax.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{tx.products[0]?.igstAmount > 0 ? 'IGST' : 'CGST/SGST'}</div>
                </td>
                <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                  ₹{tx.grandTotal.toFixed(2)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No transactions recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Left side: Setup & Details */}
            <div className="p-6 md:w-1/2 border-r border-gray-100 dark:border-gray-700 overflow-y-auto">
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Create Transaction</h2>
              
              <div className="space-y-5">
                {/* Type Selection */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button onClick={() => setType('SALE')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${type==='SALE' ? 'bg-white dark:bg-gray-600 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                    Sale (Out)
                  </button>
                  <button onClick={() => setType('PURCHASE')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${type==='PURCHASE' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                    Purchase (In)
                  </button>
                </div>

                {/* Party Details */}
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300 flex items-center gap-1">
                    <IndianRupee size={16} /> {type === 'SALE' ? 'Customer Name' : 'Supplier Name'}
                  </label>
                  <input type="text" value={customerOrSupplierName} onChange={e => setCustomerOrSupplierName(e.target.value)} required
                    className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-primary-500" placeholder="e.g. Acme Corp" />
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800">
                  <input type="checkbox" id="igst" checked={isIGST} onChange={e => setIsIGST(e.target.checked)} className="rounded" />
                  <label htmlFor="igst" className="text-sm font-medium">Inter-state transaction (Use IGST instead of CGST/SGST)</label>
                </div>

                {/* Adding Products */}
                <div className="pt-4 border-t dark:border-gray-700">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Add Line Item</label>
                  <div className="flex gap-2">
                    <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm">
                      <option value="">Select a product...</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.sku} - {p.product_name} (Stock: {p.quantity})</option>
                      ))}
                    </select>
                    <input type="number" min="1" value={selectedQuantity} onChange={e => setSelectedQuantity(e.target.value)} className="w-20 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm" placeholder="Qty" />
                    <button type="button" onClick={addToCart} className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium">Add</button>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium mb-1 dark:text-gray-300 gap-1 flex items-center"><FileText size={16}/> Notes</label>
                   <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className="w-full border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600"></textarea>
                </div>
              </div>
            </div>

            {/* Right side: Cart & Math */}
            <div className="p-6 md:w-1/2 bg-gray-50 dark:bg-gray-900/50 flex flex-col items-stretch overflow-y-auto">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Tag size={20}/> Cart & Invoice Preview</h3>
              
              <div className="flex-1 space-y-3 mb-6">
                {cart.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 border border-dashed rounded-lg border-gray-300 dark:border-gray-700">Cart is empty.<br/>Add items on the left to calculate GST.</div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm relative group">
                       <div>
                         <div className="font-medium text-sm text-gray-900 dark:text-white">{item.productName}</div>
                         <div className="text-xs text-gray-500">{item.quantity} x ₹{item.unitPrice.toFixed(2)} (+{item.gstRate}% GST)</div>
                       </div>
                       <div className="text-right">
                         <div className="font-bold text-sm">₹{((item.quantity * item.unitPrice) * (1 + item.gstRate/100)).toFixed(2)}</div>
                         <button onClick={() => removeFromCart(item.product)} className="text-xs text-red-500 absolute -top-2 -right-2 bg-red-100 p-1 rounded-full opacity-0 group-hover:opacity-100 transition">X</button>
                       </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total Summary */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
                 <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                   <span>Taxable Base Value</span>
                   <span>₹{cartTotals.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-3 pb-3 border-b dark:border-gray-700">
                   <span>{isIGST ? 'IGST' : 'CGST & SGST'} Applied</span>
                   <span>₹{cartTotals.tax.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white mb-6">
                   <span>Grand Total</span>
                   <span className="text-primary-600">₹{cartTotals.total.toFixed(2)}</span>
                 </div>

                 <div className="flex gap-3">
                   <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 font-medium bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition">Cancel</button>
                   <button onClick={handleCreateTransaction} disabled={cart.length === 0} className="flex-1 py-3 font-medium text-white bg-primary-600 rounded-lg shadow disabled:opacity-50 hover:bg-primary-700 transition">Process {type}</button>
                 </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Transactions;
