import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Truck, Search, ChevronRight, ArrowLeft, ShoppingCart, RotateCcw, 
  Calendar, FileText, Phone, Mail, Tag, Loader2, AlertCircle, RefreshCcw,
  Package, ChevronDown, ChevronUp, Hash, DollarSign, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:8080/api';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // State for expanded transaction details
  const [expandedId, setExpandedId] = useState(null);
  const [detailsData, setDetailsData] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(null);

  const getConfig = useCallback(() => {
    const u = JSON.parse(localStorage.getItem('userInfo'));
    return { headers: { Authorization: `Bearer ${u?.token || ''}` } };
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/purchases/suppliers-list/all`, getConfig());
      setSuppliers(res.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Fetch suppliers failed:', err);
      setError('Failed to load suppliers data');
    } finally {
      setLoading(false);
    }
  }, [getConfig]);

  const fetchLedger = async (supplier) => {
    setLoadingLedger(true);
    setExpandedId(null);
    setDetailsData({});
    try {
      const res = await axios.get(`${API}/purchases/supplier-ledger/${supplier.id}`, getConfig());
      setLedger(res.data.data || []);
      setSelectedSupplier(supplier);
    } catch (err) {
      console.error('Fetch ledger failed:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchTransactionDetails = async (item) => {
    const key = `${item.type}-${item.id}`;

    // Toggle: if already expanded, collapse
    if (expandedId === key) {
      setExpandedId(null);
      return;
    }

    setExpandedId(key);

    // If already fetched, just show cached data
    if (detailsData[key]) return;

    setLoadingDetails(key);
    try {
      let res;
      if (item.type === 'PURCHASE') {
        res = await axios.get(`${API}/purchases/${item.id}`, getConfig());
        const rows = res.data.data?.items || [];
        setDetailsData(prev => ({
          ...prev,
          [key]: rows.map(r => ({
            product_name: r.PRODUCT_NAME || r.product_name,
            hsn_code:     r.HSN_CODE || r.hsn_code,
            quantity:     r.QUANTITY || r.quantity,
            unit_price:   r.UNIT_PRICE || r.unit_price,
            gst_rate:     r.GST_RATE || r.gst_rate,
            total_amount: r.TOTAL_AMOUNT || r.total_amount,
          }))
        }));
      } else {
        // RETURN — item.id is return_id
        res = await axios.get(`${API}/purchase-returns/${item.id}`, getConfig());
        const rows = res.data.data?.items || [];
        setDetailsData(prev => ({
          ...prev,
          [key]: rows.map(r => ({
            product_name: r.PRODUCT_NAME || r.product_name,
            hsn_code:     r.HSN_CODE || r.hsn_code,
            quantity:     r.QUANTITY || r.quantity,
            unit_price:   r.UNIT_PRICE || r.unit_price,
            gst_rate:     r.GST_RATE || r.gst_rate || r.GST_RATE,
            total_amount: r.TOTAL_AMOUNT || r.total_amount,
          }))
        }));
      }
    } catch (err) {
      console.error('Fetch transaction details failed:', err);
      const key2 = `${item.type}-${item.id}`;
      setDetailsData(prev => ({ ...prev, [key2]: [] }));
    } finally {
      setLoadingDetails(null);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = suppliers.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone || '').includes(searchTerm) ||
    (s.gst || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    count: suppliers.length,
    totalPurchases: suppliers.reduce((sum, s) => sum + (s.totalPurchaseValue || 0), 0),
    totalReturns: suppliers.reduce((sum, s) => sum + (s.totalReturnValue || 0), 0)
  };

  if (loading && suppliers.length === 0) {
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
            <Truck className="text-primary-500" /> Supplier Directory
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage procurement history and supplier relations</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchSuppliers}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-blue-500">Registered Suppliers</p>
          <p className="text-2xl font-bold mt-1">{stats.count}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-green-500">Procurement Value</p>
          <p className="text-2xl font-bold mt-1">₹{stats.totalPurchases.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-orange-500">Return to Supplier</p>
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
              placeholder="Search by name, GST or contact..."
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
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Purchases / Returns</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={10} /> Last procurement: {s.lastTransaction ? new Date(s.lastTransaction).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {s.phone && <div className="text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><Phone size={12}/> {s.phone}</div>}
                      {s.gst && <div className="text-[11px] flex items-center gap-1.5 text-gray-500 border border-gray-200 dark:border-gray-600 w-fit px-1.5 rounded bg-gray-50 dark:bg-gray-900/30 uppercase"><Tag size={10}/> {s.gst}</div>}
                      {s.email && <div className="text-[11px] flex items-center gap-1.5 text-gray-400 italic font-mono"><Mail size={10}/> {s.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Purchases</p>
                          <p className="text-sm font-semibold text-green-600">{s.totalPurchases}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-400 uppercase">Returns</p>
                          <p className="text-sm font-semibold text-orange-600">{s.totalReturns}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => fetchLedger(s)}
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
                       <p>No suppliers found matching your search</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide-over */}
      <AnimatePresence>
        {selectedSupplier && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSupplier(null)}
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
                  <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold">{selectedSupplier.name}</h2>
                    <p className="text-sm text-primary-100 opacity-80">{selectedSupplier.phone || selectedSupplier.gst || 'Purchase Ledger'}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingLedger ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <p className="text-sm text-gray-500">Fetching procurement history...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800">
                        <p className="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold tracking-wider">Total Purchases</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">₹{selectedSupplier.totalPurchaseValue.toLocaleString()}</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-bold tracking-wider">Total Returns</p>
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-1">₹{selectedSupplier.totalReturnValue.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <FileText size={18} className="text-primary-500" /> Procurement Timeline
                      </h3>
                      <p className="text-xs text-gray-400 -mt-2">Click on any transaction to view item details</p>
                      
                      <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-3 pl-6 space-y-4 pb-8">
                        {ledger.map((item, idx) => {
                          const key = `${item.type}-${item.id}`;
                          const isExpanded = expandedId === key;
                          const isLoadingThis = loadingDetails === key;
                          const items = detailsData[key] || [];

                          return (
                            <div key={idx} className="relative group">
                              <div className={`absolute -left-[31px] top-4 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${item.type === 'RETURN' ? 'bg-orange-500' : 'bg-green-500'}`} />
                              
                              {/* Transaction Card - clickable */}
                              <div 
                                className={`rounded-2xl border transition-all shadow-sm cursor-pointer select-none
                                  ${isExpanded 
                                    ? 'bg-white dark:bg-gray-800 border-primary-200 dark:border-primary-800 shadow-md ring-1 ring-primary-200 dark:ring-primary-800' 
                                    : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 hover:shadow-md'
                                  }`}
                                onClick={() => fetchTransactionDetails(item)}
                              >
                                {/* Header Row */}
                                <div className="flex justify-between items-start p-4">
                                  <div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.type === 'RETURN' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                      {item.type}
                                    </span>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1">{item.invoiceNumber}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="text-lg font-black text-gray-900 dark:text-white">₹{Number(item.total).toLocaleString('en-IN')}</p>
                                      <p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className={`p-1 rounded-full transition-all ${isExpanded ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
                                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                  </div>
                                </div>

                                {/* Status Row */}
                                <div className="flex items-center gap-3 px-4 pb-3 text-[10px] text-gray-400">
                                  <span className={`flex items-center gap-1 uppercase font-bold ${item.paymentStatus === 'PAID' ? 'text-green-500' : 'text-orange-500'}`}>
                                    {item.paymentStatus}
                                  </span>
                                  {item.notes && <span className="flex items-center gap-1"><FileText size={10} /> Notes</span>}
                                  <span className="ml-auto text-[10px] text-gray-400 italic">
                                    {isExpanded ? 'Click to collapse' : 'Click to view items'}
                                  </span>
                                </div>

                                {/* Expandable Items Section */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                                      className="overflow-hidden"
                                    >
                                      <div className="border-t border-gray-100 dark:border-gray-700 mx-4 mb-3" />
                                      
                                      {isLoadingThis ? (
                                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                                          <Loader2 size={16} className="animate-spin text-primary-500" />
                                          Fetching item details...
                                        </div>
                                      ) : items.length === 0 ? (
                                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                                          <Package size={16} />
                                          No item details found
                                        </div>
                                      ) : (
                                        <div className="px-4 pb-4 space-y-2">
                                          {/* Items Header */}
                                          <div className="grid grid-cols-12 gap-1 text-[9px] font-bold uppercase tracking-wider text-gray-400 px-2">
                                            <div className="col-span-5">Product</div>
                                            <div className="col-span-2 text-center">HSN</div>
                                            <div className="col-span-1 text-center">Qty</div>
                                            <div className="col-span-2 text-right">Unit Price</div>
                                            <div className="col-span-2 text-right">Total</div>
                                          </div>
                                          
                                          {/* Items List */}
                                          {items.map((prod, pIdx) => (
                                            <motion.div
                                              key={pIdx}
                                              initial={{ x: -10, opacity: 0 }}
                                              animate={{ x: 0, opacity: 1 }}
                                              transition={{ delay: pIdx * 0.05 }}
                                              className={`grid grid-cols-12 gap-1 items-center px-2 py-2 rounded-lg text-xs
                                                ${item.type === 'RETURN' 
                                                  ? 'bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30' 
                                                  : 'bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30'
                                                }`}
                                            >
                                              <div className="col-span-5 font-semibold text-gray-800 dark:text-gray-200 truncate" title={prod.product_name}>
                                                {prod.product_name || '—'}
                                              </div>
                                              <div className="col-span-2 text-center">
                                                <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">
                                                  {prod.hsn_code || '—'}
                                                </span>
                                              </div>
                                              <div className="col-span-1 text-center font-bold text-gray-700 dark:text-gray-300">
                                                {prod.quantity ?? '—'}
                                              </div>
                                              <div className="col-span-2 text-right text-gray-600 dark:text-gray-400">
                                                ₹{Number(prod.unit_price || 0).toLocaleString('en-IN')}
                                              </div>
                                              <div className={`col-span-2 text-right font-bold ${item.type === 'RETURN' ? 'text-orange-600 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                                                ₹{Number(prod.total_amount || 0).toLocaleString('en-IN')}
                                              </div>
                                            </motion.div>
                                          ))}

                                          {/* Summary Footer */}
                                          <div className="flex justify-between items-center pt-2 px-2 border-t border-gray-100 dark:border-gray-700 mt-1">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                                            <span className={`text-sm font-black ${item.type === 'RETURN' ? 'text-orange-600 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                                              Grand Total: ₹{items.reduce((sum, p) => sum + Number(p.total_amount || 0), 0).toLocaleString('en-IN')}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          );
                        })}
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

export default Suppliers;
