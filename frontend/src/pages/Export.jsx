import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  Download, FileSpreadsheet, FileJson, FileText, FileDown,
  AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp,
  Filter, RefreshCw, MessageSquare, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GstAssistant from '../components/GstAssistant';

const API = 'http://localhost:8080/api/exports';

const getConfig = () => {
  const u = JSON.parse(localStorage.getItem('userInfo') || '{}');
  return { headers: { Authorization: `Bearer ${u?.token || ''}` } };
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0];
};

// ── Return type tile config ────────────────────────────────────────────────────

const RETURN_TILES = [
  {
    id: 'gstr1',
    label: 'GSTR-1',
    subtitle: 'Outward Supplies',
    color: 'blue',
    endpoint: '/gstr1',
    jsonEndpoint: '/gstr1-json',
    description: 'Statement of outward supplies (sales). File by the 11th of next month.',
    formats: ['json', 'xlsx', 'csv'],
  },
  {
    id: 'gstr3b',
    label: 'GSTR-3B',
    subtitle: 'Summary Return',
    color: 'purple',
    endpoint: '/gstr3b-summary',
    description: 'Monthly self-assessed summary with ITC and tax payable.',
    formats: ['csv'],
  },
  {
    id: 'hsn',
    label: 'HSN Summary',
    subtitle: 'Table 12 — GSTR-1',
    color: 'teal',
    endpoint: '/hsn-summary',
    description: 'HSN-wise aggregate of supplies. Required for GSTR-1 Table 12.',
    formats: ['xlsx', 'csv'],
  },
  {
    id: 'cdnr',
    label: 'CDNR',
    subtitle: 'Credit / Debit Notes',
    color: 'orange',
    endpoint: '/credit-debit-notes',
    description: 'Credit and debit notes register for GST adjustments.',
    formats: ['xlsx', 'csv'],
  },
  {
    id: 'sales',
    label: 'Sales Export',
    subtitle: 'All Invoices',
    color: 'green',
    endpoint: '/sales',
    description: 'Complete sales invoice register with item-level GST breakdown.',
    formats: ['csv'],
  },
  {
    id: 'purchases',
    label: 'Purchase Export',
    subtitle: 'Inward Supplies',
    color: 'red',
    endpoint: '/purchases',
    description: 'Purchase register — the basis for ITC claims and GSTR-2B reconciliation.',
    formats: ['csv'],
  },
];

const COLOR_MAP = {
  blue:   { tile: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  purple: { tile: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', label: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  teal:   { tile: 'border-teal-500 bg-teal-50 dark:bg-teal-900/20', label: 'text-teal-700 dark:text-teal-300', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  orange: { tile: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', label: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  green:  { tile: 'border-green-500 bg-green-50 dark:bg-green-900/20', label: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  red:    { tile: 'border-red-500 bg-red-50 dark:bg-red-900/20', label: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

// ── Icon for format button ─────────────────────────────────────────────────────
const FormatIcon = ({ format }) => {
  const icons = { json: FileJson, xlsx: FileSpreadsheet, csv: FileDown, pdf: FileText };
  const Icon = icons[format] || FileDown;
  return <Icon className="w-3.5 h-3.5" />;
};

// ── Status badge for table rows ────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  if (!status) return null;
  const matched = status === 'Matched';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      matched
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {matched ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {status}
    </span>
  );
};

// ── Export page ────────────────────────────────────────────────────────────────
const Export = () => {
  const { user } = useContext(AuthContext);
  const [activeTile, setActiveTile] = useState('gstr1');
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [invoiceType, setInvoiceType] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [infoTooltip, setInfoTooltip] = useState(null);

  const tile = RETURN_TILES.find(t => t.id === activeTile);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (activeTile === 'gstr1' && invoiceType !== 'ALL') params.append('invoiceType', invoiceType);
      const { data: d } = await axios.get(`${API}${tile.endpoint}?${params}`, getConfig());
      setData(d);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [activeTile, startDate, endDate, invoiceType, tile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Download handler ───────────────────────────────────────────────────────
  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const params = new URLSearchParams({ startDate, endDate, format: format === 'xlsx' ? 'excel' : format });
      if (activeTile === 'gstr1' && invoiceType !== 'ALL') params.append('invoiceType', invoiceType);

      let endpoint = tile.endpoint;
      if (format === 'json' && tile.jsonEndpoint) endpoint = tile.jsonEndpoint;

      const response = await axios.get(`${API}${endpoint}?${params}`, {
        ...getConfig(),
        responseType: format === 'xlsx' ? 'blob' : format === 'json' && !tile.jsonEndpoint ? 'json' : 'blob',
      });

      const mimeMap = { csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json' };
      const extMap = { csv: '.csv', xlsx: '.xlsx', json: '.json' };
      const blob = new Blob([
        format === 'json' && !tile.jsonEndpoint
          ? JSON.stringify(response.data, null, 2)
          : response.data
      ], { type: mimeMap[format] });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tile.label.replace(/\s/g,'_')}_${startDate}_${endDate}${extMap[format]}`;
      a.click();
    } catch (err) {
      alert('Download failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setDownloading('');
    }
  };

  // ── Flatten data rows ──────────────────────────────────────────────────────
  const getRows = () => {
    if (!data) return [];
    if (data.data) {
      if (Array.isArray(data.data)) return data.data;
      // GSTR-1 nested
      const { b2b = [], b2cl = [], b2cs = [], exp = [], cdnr = [] } = data.data;
      return [...b2b, ...b2cl, ...b2cs, ...exp, ...cdnr];
    }
    return [];
  };

  const rows = getRows();

  // ── Summary cards from GSTR-3B ─────────────────────────────────────────────
  const render3BSummary = () => {
    if (activeTile !== 'gstr3b' || !data?.data) return null;
    const d = data.data;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Outward Tax (CGST)', value: fmt(d.outwardSupplies?.cgst) },
          { label: 'Outward Tax (SGST)', value: fmt(d.outwardSupplies?.sgst) },
          { label: 'Outward Tax (IGST)', value: fmt(d.outwardSupplies?.igst) },
          { label: 'ITC Available (CGST)', value: fmt(d.itcAvailable?.cgst) },
          { label: 'ITC Available (SGST)', value: fmt(d.itcAvailable?.sgst) },
          { label: 'Net Tax Payable', value: fmt(d.netTaxPayable?.total) },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex gap-0 h-full -m-6 md:-m-8 overflow-hidden">
      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${assistantOpen ? 'w-[calc(100%-360px)]' : 'w-full'}`}>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GST Export & Filing</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Generate GSTR-1, GSTR-3B, HSN summary, and register exports for filing.</p>
            </div>
            <button onClick={() => setAssistantOpen(o => !o)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border shadow-sm ${
                assistantOpen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}>
              <MessageSquare className="w-4 h-4" />
              {assistantOpen ? 'Hide Assistant' : 'GST Assistant'}
            </button>
          </div>

          {/* Return type tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {RETURN_TILES.map(t => {
              const c = COLOR_MAP[t.color];
              const isActive = activeTile === t.id;
              return (
                <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTile(t.id)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                    isActive ? c.tile + ' border-opacity-100 shadow-md' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <p className={`text-sm font-bold ${isActive ? c.label : 'text-gray-700 dark:text-gray-200'}`}>{t.label}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t.subtitle}</p>
                  {isActive && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${c.badge.split(' ')[0]}`} />}
                </motion.button>
              );
            })}
          </div>

          {/* Active tile info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{tile?.description}</span>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowFilters(f => !f)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
              <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-gray-400" /> Filters & Date Range</div>
              {showFilters ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4 flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {activeTile === 'gstr1' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Invoice Type</label>
                        <select value={invoiceType} onChange={e => setInvoiceType(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {['ALL', 'B2B', 'B2CL', 'B2CS', 'EXP', 'CDNR'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}
                    <button onClick={fetchData}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Export as:</span>
            {tile?.formats.map(f => (
              <button key={f} onClick={() => handleDownload(f)} disabled={!!downloading || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition">
                {downloading === f ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FormatIcon format={f} />}
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div><strong>Error:</strong> {error}</div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="animate-pulse space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg" />)}
            </div>
          )}

          {/* GSTR-3B summary cards */}
          {!loading && !error && render3BSummary()}

          {/* Data table */}
          {!loading && !error && data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">

              {/* Table header stats */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{tile?.label} — {startDate} to {endDate}</span>
                  <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium">
                    {rows.length} record{rows.length !== 1 ? 's' : ''}
                  </span>
                  {data?.summary && (
                    <>
                      {data.summary.b2bCount > 0 && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">B2B: {data.summary.b2bCount}</span>}
                      {data.summary.b2clCount > 0 && <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs rounded-full">B2CL: {data.summary.b2clCount}</span>}
                      {data.summary.expCount > 0 && <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">EXP: {data.summary.expCount}</span>}
                    </>
                  )}
                </div>
                {data.warning && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>GST columns not set up</span>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {rows.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {['Invoice #', 'Date', 'Type', 'Party / GSTIN', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {rows.slice(0, 50).map((row, i) => {
                        const invNum = row.INVOICE_NUMBER || row.invoice_number || row.noteNumber || '—';
                        const invDate = row.INVOICE_DATE || row.invoice_date || row.noteDate;
                        const invType = row.INVOICE_TYPE || row.invoice_type || row.noteType || '—';
                        const party = row.CUSTOMER_NAME || row.customer_name || row.customerName || row.SUPPLIER_NAME || row.supplier_name || '—';
                        const gstin = row.CUSTOMER_GSTIN || row.customer_gstin || row.customerGSTIN || row.SUPPLIER_GSTIN || row.supplier_gstin || '—';
                        const taxable = row.TOTAL_TAXABLE_VALUE || row.total_taxable_value || row.taxableValue || 0;
                        const cgst = row.TOTAL_CGST || row.total_cgst || row.cgst || row.CGST_AMOUNT || 0;
                        const sgst = row.TOTAL_SGST || row.total_sgst || row.sgst || row.SGST_AMOUNT || 0;
                        const igst = row.TOTAL_IGST || row.total_igst || row.igst || row.IGST_AMOUNT || 0;
                        const total = row.TOTAL_INVOICE_VALUE || row.total_invoice_value || row.totalAmount || row.TOTAL_VALUE || row.total_value || 0;
                        const dateStr = invDate ? new Date(invDate).toLocaleDateString('en-IN') : '—';

                        return (
                          <motion.tr key={i} whileHover={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{invNum}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{dateStr}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">{invType}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                              <div className="font-medium">{party}</div>
                              <div className="text-gray-400 text-[10px]">{gstin}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-right text-gray-600 dark:text-gray-300 font-mono">{(taxable !== null && taxable !== undefined) ? fmt(taxable) : '—'}</td>
                            <td className="px-4 py-3 text-xs text-right text-gray-600 dark:text-gray-300 font-mono">{(cgst !== null && cgst !== undefined) ? fmt(cgst) : '—'}</td>
                            <td className="px-4 py-3 text-xs text-right text-gray-600 dark:text-gray-300 font-mono">{(sgst !== null && sgst !== undefined) ? fmt(sgst) : '—'}</td>
                            <td className="px-4 py-3 text-xs text-right text-gray-600 dark:text-gray-300 font-mono">{(igst !== null && igst !== undefined) ? fmt(igst) : '—'}</td>
                            <td className="px-4 py-3 text-xs text-right font-semibold text-gray-900 dark:text-white font-mono">{(total !== null && total !== undefined) ? fmt(total) : '—'}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.match_status || null} />
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No records found for this period</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting the date range or adding transactions first.</p>
                    <button onClick={() => setAssistantOpen(true)}
                      className="mt-4 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      <MessageSquare className="w-3.5 h-3.5" /> Ask GST Assistant for help
                    </button>
                  </div>
                )}
                {rows.length > 50 && (
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
                    Showing first 50 of {rows.length} records. Export to see all.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── GST Assistant Panel ────────────────────────────────────────────── */}
      <AnimatePresence>
        {assistantOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 overflow-hidden border-l border-gray-200 dark:border-gray-700">
            <div className="w-[360px] h-full">
              <GstAssistant isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Export;
