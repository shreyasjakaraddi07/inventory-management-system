import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
  Package, AlertTriangle, ListOrdered, TrendingUp, TrendingDown, IndianRupee,
  ShoppingCart, RotateCcw, Users, Truck, BarChart2, Download, Bell, X
} from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const API = 'http://localhost:8080/api';
const FILTER_KEY = 'dashboard_filter';

// ── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString('en-IN');

const getConfig = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  return { headers: { Authorization: `Bearer ${userInfo?.token || ''}` } };
};

const exportCSV = (stats, filter) => {
  const label = filter === 'mtd' ? 'Month to Date' : filter === 'ytd' ? 'Year to Date' : 'All Time';
  const rows = [
    ['Dashboard Export — ' + label],
    [],
    ['Metric', 'Value'],
    ['Total Revenue', stats.totalRevenue],
    ['Total Expenses', stats.totalExpenses],
    ['Net Profit', stats.totalProfit],
    ['Inventory Value', stats.inventoryValue],
    ['Quantity In Hand', stats.quantityInHand],
    ['Total Items', stats.totalItems],
    ['Sales Orders', stats.totalSales],
    ['Purchase Orders', stats.totalPurchases],
    ['Total Returns', stats.totalReturns],
    ['Low Stock Items', stats.lowStockCount],
    ['Customers', stats.totalCustomers],
    ['Suppliers', stats.totalSuppliers],
    [],
    ['Month', 'Sales (₹)', 'Purchases (₹)'],
    ...(stats.monthlyChart || []).map(m => [m.month, m.sales, m.purchases]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dashboard_${filter}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
};

// ── component ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(() => localStorage.getItem(FILTER_KEY) || 'all');
  const [notifications, setNotifications] = useState([]);

  const fetchStats = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/dashboard/stats?filter=${f}`, getConfig());
      setStats(data);

      // Build notifications
      const notes = [];
      if ((data.lowStockCount || 0) > 0) {
        notes.push({ id: 'low-stock', type: 'warning', msg: `${data.lowStockCount} product(s) are low on stock (≤10 units).` });
      }
      if ((data.totalSaleReturns || 0) > 5) {
        notes.push({ id: 'high-returns', type: 'error', msg: `High sale returns detected: ${data.totalSaleReturns} returns recorded.` });
      }
      setNotifications(notes);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(filter);
  }, [filter, fetchStats]);

  const handleFilter = (f) => {
    localStorage.setItem(FILTER_KEY, f);
    setFilter(f);
  };

  const dismissNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  // ── loading skeleton ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>)}
      </div>
    </div>
  );

  // ── error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        <strong>Error:</strong> {error}
      </div>
    </div>
  );

  // ── stat cards definition ──────────────────────────────────────────────────
  const filterLabel = filter === 'mtd' ? 'Month to Date' : filter === 'ytd' ? 'Year to Date' : 'All Time';

  const primaryCards = [
    { title: 'Total Revenue',   value: fmt(stats?.totalRevenue),   icon: TrendingUp,   color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-900/30',  delay: 0.1 },
    { title: 'Total Expenses',  value: fmt(stats?.totalExpenses),  icon: TrendingDown, color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-100 dark:bg-red-900/30',    delay: 0.2 },
    { title: 'Net Profit',      value: fmt(stats?.totalProfit),    icon: IndianRupee,  color: (stats?.totalProfit || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400', bg: 'bg-blue-100 dark:bg-blue-900/30', delay: 0.3 },
    { title: 'Inventory Value', value: fmt(stats?.inventoryValue), icon: Package,      color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-100 dark:bg-blue-900/30',  delay: 0.4 },
  ];

  const secondaryCards = [
    { title: 'Sales Orders',    value: fmtN(stats?.totalSales),      icon: ShoppingCart, color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-900/30',  delay: 0.1 },
    { title: 'Purchase Orders', value: fmtN(stats?.totalPurchases),  icon: Truck,        color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', delay: 0.2 },
    { title: 'Total Returns',   value: fmtN(stats?.totalReturns),    icon: RotateCcw,    color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-100 dark:bg-red-900/30',    delay: 0.3 },
    { title: 'Low Stock Items', value: fmtN(stats?.lowStockCount),   icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', delay: 0.4 },
  ];

  const inventoryCards = [
    { title: 'Qty In Hand',   value: fmtN(stats?.quantityInHand), icon: BarChart2,     color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', delay: 0.1 },
    { title: 'Total Items',   value: fmtN(stats?.totalItems),     icon: ListOrdered,   color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/30',   delay: 0.2 },
    { title: 'Customers',     value: fmtN(stats?.totalCustomers), icon: Users,         color: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-100 dark:bg-teal-900/30',   delay: 0.3 },
    { title: 'Suppliers',     value: fmtN(stats?.totalSuppliers), icon: Truck,         color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', delay: 0.4 },
  ];

  const renderCards = (cards) => cards.map((card, idx) => (
    <motion.div
      key={idx}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: card.delay }}
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-700/50 flex items-center relative overflow-hidden"
    >
      <div className={`p-4 rounded-2xl ${card.bg} ${card.color} mr-4 flex-shrink-0 z-10`}>
        <card.icon className="w-6 h-6" />
      </div>
      <div className="z-10">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{card.value}</p>
      </div>
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 ${card.bg}`} />
    </motion.div>
  ));

  return (
    <div className="space-y-6">
      {/* Header row */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's your business financial and inventory overview.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter buttons */}
          {[['all', 'All Time'], ['mtd', 'Month to Date'], ['ytd', 'Year to Date']].map(([val, label]) => (
            <button key={val} onClick={() => handleFilter(val)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all border ${
                filter === val
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>{label}</button>
          ))}
          {/* Export button */}
          <button onClick={() => exportCSV(stats, filter)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(n => (
            <motion.div key={n.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
                n.type === 'warning'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}>
              <span className="flex items-center gap-2"><Bell className="w-4 h-4 flex-shrink-0" />{n.msg}</span>
              <button onClick={() => dismissNotification(n.id)} className="opacity-60 hover:opacity-100 transition"><X className="w-4 h-4" /></button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filter label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Showing: {filterLabel}
      </p>

      {/* Row 1: Primary financial cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderCards(primaryCards)}
      </div>

      {/* Row 2: Operations cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderCards(secondaryCards)}
      </div>

      {/* Row 3: Inventory / Users cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderCards(inventoryCards)}
      </div>

      {/* Row 4: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales vs Purchase Line Chart */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/50 dark:bg-primary-900/20 rounded-bl-full -z-10 blur-2xl"></div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Sales vs Purchases (Last 12 Months)</h2>
          <div className="h-72">
            {(stats?.monthlyChart || []).some(m => m.sales > 0 || m.purchases > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v, name) => [fmt(v), name === 'sales' ? 'Sales' : 'Purchases']}
                    wrapperStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend formatter={(v) => v === 'sales' ? 'Sales' : 'Purchases'} />
                  <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="purchases" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No sales / purchase data yet</div>
            )}
          </div>
        </motion.div>

        {/* Category Distribution Pie Chart */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-700/50 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100/50 dark:bg-purple-900/20 rounded-tr-full -z-10 blur-2xl"></div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Category Distribution</h2>
          <div className="h-72">
            {stats?.categoryDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.categoryDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    paddingAngle={5} dataKey="count" nameKey="_id"
                    label={({ _id, percent }) => `${_id} (${(percent * 100).toFixed(0)}%)`}>
                    {stats.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No category data available</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Row 5: Recent Products + Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Added Products */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-700/50 relative overflow-hidden">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recently Added Products</h2>
          <div className="overflow-x-auto">
            {stats?.recentProducts?.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.recentProducts.map((product) => (
                    <motion.tr whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }} key={product._id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs">📦</div>
                        {product.product_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.sku || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.quantity === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          product.quantity < 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>{product.quantity}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
                <img src="https://cdn3d.iconscout.com/3d/premium/thumb/empty-box-4994276-4159570.png" alt="Empty Box 3D" className="w-32 h-32 mb-4 drop-shadow-xl" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No products added yet.</p>
                <p className="text-xs text-gray-400 mt-1">Start adding inventory to see activity here!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Low Stock Alert Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/50 dark:border-gray-700/50 relative overflow-hidden">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Low Stock Alerts
          </h2>
          {stats?.lowStockItems?.length > 0 ? (
            <div className="space-y-3">
              {stats.lowStockItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800/30 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.product_name}</p>
                    {item.hsn_code && <p className="text-xs text-gray-400">HSN: {item.hsn_code}</p>}
                  </div>
                  <span className={`text-sm font-black px-3 py-1 rounded-lg ${
                    item.quantity === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>{item.quantity} left</span>
                </div>
              ))}
              {(stats.lowStockCount || 0) > 5 && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 pt-1">
                  +{stats.lowStockCount - 5} more low-stock items. Check Inventory for full list.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
              <Package className="w-12 h-12 text-green-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">All stock levels are healthy!</p>
              <p className="text-xs text-gray-400 mt-1">No items below the threshold of 10 units.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
