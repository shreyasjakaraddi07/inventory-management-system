import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Users, Search, ChevronRight, ArrowLeft, TrendingUp, TrendingDown, 
  Calendar, FileText, Phone, Tag, Loader2, AlertCircle, RefreshCcw, 
  ChevronDown, ChevronUp, Package, Printer 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { printTransaction } from '../utils/printUtils';

const API = 'http://localhost:8080/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [txDetailsCache, setTxDetailsCache] = useState({});
  const [loadingTxId, setLoadingTxId] = useState(null);

  const getConfig = useCallback(() => {
    const u = JSON.parse(localStorage.getItem('userInfo'));
    return { headers: { Authorization: `Bearer ${u?.token || ''}` } };
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/customers`, getConfig());
      const mapped = (res.data.data || []).map(c => ({
        id: c.CUSTOMER_ID,
        name: c.CUSTOMER_NAME,
        phone: c.PHONE_NUMBER,
        email: c.EMAIL_ID,
        gst: c.GST_NUMBER,
        city: c.CITY,
        totalSales: c.TOTAL_SALES || 0,
        totalReturns: c.TOTAL_RETURNS || 0
      }));
      setCustomers(mapped);
      setError(null);
    } catch (err) {
      console.error('Fetch customers failed:', err);
      setError('Failed to load customers data');
    } finally {
      setLoading(false);
    }
  }, [getConfig]);

  const fetchLedger = async (customer) => {
    setLoadingLedger(true);
    setSelectedCustomer(customer); // Show drawer immediately with old data
    try {
      const res = await axios.get(`${API}/customers/${customer.id}`, getConfig());
      const { summary, sales, returns } = res.data.data;
      
      const mappedSales = sales.map(s => ({
        ...s,
        _id: `sale_${s.invoiceId}`,
        rawId: s.invoiceId,
        type: 'SALE',
        total: s.totalAmount,
        invoiceNumber: s.invoiceNumber,
        date: s.date,
        paymentMethod: 'CASH',
        notes: ''
      }));

      const mappedReturns = returns.map(r => ({
        ...r,
        _id: `return_${r.returnId}`,
        rawId: r.returnId,
        type: 'RETURN',
        total: r.totalRefund,
        invoiceNumber: r.returnNumber + ` (against ${r.invoiceNumber})`,
        date: r.date,
        paymentMethod: 'REFUND',
        notes: ''
      }));

      const combined = [...mappedSales, ...mappedReturns].sort((a, b) => new Date(b.date) - new Date(a.date));

      setLedger(combined);
      setSelectedCustomer(prev => ({
        ...prev,
        totalSaleValue: summary.totalSales,
        totalReturnValue: summary.totalReturns
      }));
    } catch (err) {
      console.error('Fetch ledger failed:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const toggleTransaction = async (txId) => {
    if (expandedTxId === txId) {
      setExpandedTxId(null);
      return;
    }
    setExpandedTxId(txId);
    
    if (!txDetailsCache[txId]) {
      setLoadingTxId(txId);
      try {
        const isReturn = txId.startsWith('return_');
        const realId = isReturn ? txId.split('_')[1] : (txId.startsWith('sale_') ? txId.split('_')[1] : txId);
        
        let productsData = [];
        if (!isReturn) {
          const res = await axios.get(`${API}/sales/${realId}`, getConfig());
          const rawItems = res.data.data?.products || res.data.data?.items || [];
          // Map uppercase Oracle keys to camelCase for the frontend UI
          productsData = rawItems.map(item => ({
            productName: item.PRODUCT_NAME || item.productName,
            hsnCode: item.HSN_CODE || item.hsnCode,
            quantity: item.QUANTITY || item.quantity,
            unitPrice: item.UNIT_PRICE || item.unitPrice || item.sellingPrice,
            totalAmount: item.TOTAL_AMOUNT || item.totalAmount
          }));
        } else {
          // Fetch return details
          const res = await axios.get(`${API}/sales/returns/${realId}`, getConfig());
          const rawItems = res.data.data?.products || res.data.data?.items || [];
          // Map uppercase Oracle keys to camelCase for the frontend UI
          productsData = rawItems.map(item => ({
            productName: item.PRODUCT_NAME || item.productName,
            hsnCode: item.HSN_CODE || item.hsnCode,
            quantity: item.QUANTITY || item.quantity,
            unitPrice: item.UNIT_PRICE || item.unitPrice || item.sellingPrice,
            totalAmount: item.TOTAL_AMOUNT || item.totalAmount
          }));
        }
        setTxDetailsCache(prev => ({ ...prev, [txId]: productsData }));
      } catch (err) {
        console.error('Fetch tx details err', err);
      } finally {
        setLoadingTxId(null);
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm) ||
    (c.gst || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    count: customers.length,
    totalSales: customers.reduce((sum, c) => sum + (c.totalSales || 0), 0),
    totalReturns: customers.reduce((sum, c) => sum + (c.totalReturns || 0), 0)
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Users className="text-primary-500" /> Customer Insights
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View customer transaction history and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCustomers}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Customers</p>
          <p className="text-2xl font-bold mt-1">{stats.count}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-green-500">Gross Sales Value</p>
          <p className="text-2xl font-bold mt-1">₹{stats.totalSales.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-orange-500">Total Returns Value</p>
          <p className="text-2xl font-bold mt-1">₹{stats.totalReturns.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name, phone or GST..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/30 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact & GST</th>
                <th className="px-6 py-4">Sales / Returns</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={10} /> Last active: {c.lastTransaction ? new Date(c.lastTransaction).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {c.phone && <div className="text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><Phone size={12}/> {c.phone}</div>}
                      {c.gst && <div className="text-[11px] flex items-center gap-1.5 text-gray-500 border border-gray-200 dark:border-gray-600 w-fit px-1.5 rounded bg-gray-50 dark:bg-gray-900/30 uppercase"><Tag size={10}/> {c.gst}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Sales</p>
                          <p className="text-sm font-semibold text-green-600">{c.totalSales}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Returns</p>
                          <p className="text-sm font-semibold text-orange-600">{c.totalReturns}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => fetchLedger(c)}
                        className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                       <AlertCircle size={40} className="text-gray-300" />
                       <p>No customers found matching your search</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide-over / Overlay */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-primary-600 text-white">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCustomer.name}</h2>
                    <p className="text-sm text-primary-100 opacity-80">{selectedCustomer.phone || selectedCustomer.gst || 'Customer Ledger'}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingLedger ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <p className="text-sm text-gray-500">Generating transaction history...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800">
                        <p className="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold tracking-wider">Total Sales Value</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">₹{(selectedCustomer.totalSaleValue || selectedCustomer.totalSales || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-bold tracking-wider">Total Return Value</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-1">₹{(selectedCustomer.totalReturnValue || selectedCustomer.totalReturns || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <FileText size={18} className="text-primary-500" /> Transaction Timeline
                      </h3>
                      
                      <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-3 pl-6 space-y-8 pb-8">
                        {ledger.map((item, idx) => (
                          <div key={idx} className="relative group">
                            <div className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${item.type === 'RETURN' ? 'bg-orange-500' : 'bg-green-500'}`} />
                            
                            <div 
                              onClick={() => toggleTransaction(item._id)}
                              className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:bg-white dark:hover:bg-gray-900 shadow-sm hover:shadow-md cursor-pointer"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.type === 'RETURN' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                    {item.type}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.invoiceNumber}</p>
                                    {item.type === 'SALE' && (
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          printTransaction(API, JSON.parse(localStorage.getItem('userInfo'))?.token, item); 
                                        }} 
                                        className="text-gray-400 hover:text-green-600 transition p-1" 
                                        title="Print Invoice"
                                      >
                                        <Printer size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex items-center justify-end gap-2">
                                  <div>
                                    <p className="text-lg font-black text-gray-900 dark:text-white">₹{item.total.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-gray-400 ml-2">
                                    {expandedTxId === item._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                  </div>
                                </div>
                              </div>
                              {item.notes && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic bg-white dark:bg-gray-800/50 p-2 rounded">
                                  "{item.notes}"
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400">
                                <span className="flex items-center gap-1"><Tag size={10} /> {item.paymentMethod}</span>
                                <span className="flex items-center gap-1 uppercase"><TrendingUp size={10} /> Verified</span>
                              </div>
                              
                              <AnimatePresence>
                                {expandedTxId === item._id && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                                  >
                                    {loadingTxId === item._id ? (
                                      <div className="flex justify-center items-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-2">
                                          <Package size={12} /> Items
                                        </h4>
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                          <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500">
                                              <tr>
                                                <th className="px-3 py-2">Item</th>
                                                <th className="px-3 py-2 text-right">Qty</th>
                                                <th className="px-3 py-2 text-right">Price</th>
                                                <th className="px-3 py-2 text-right">Total</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                              {(txDetailsCache[item._id] || []).map((prod, pIdx) => (
                                                <tr key={pIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{prod.productName}
                                                    {prod.hsnCode && <span className="block text-[9px] text-gray-400 font-normal">HSN: {prod.hsnCode}</span>}
                                                  </td>
                                                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{prod.quantity}</td>
                                                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">₹{prod.unitPrice || prod.sellingPrice}</td>
                                                  <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-gray-200">₹{prod.totalAmount?.toLocaleString()}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Customers;
