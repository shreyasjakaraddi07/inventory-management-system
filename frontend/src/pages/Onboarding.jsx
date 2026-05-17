import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  Building2, Cpu, Mail, Phone, Globe, MapPin,
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Sparkles, Loader2, FileText, Shield
} from 'lucide-react';

const API = 'http://localhost:8080/api';

const STEPS = [
  { id: 1, label: 'Business Info', icon: Building2 },
  { id: 2, label: 'Contact & GST', icon: FileText },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    businessName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
  });

  const set = (field, value) => {
    let finalValue = value;
    if (field === 'phone') {
      finalValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm(prev => ({ ...prev, [field]: finalValue }));
    setError('');
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.businessName.trim()) { setError('Business name is required.'); return false; }
    } else if (step === 2) {
      if (!form.phone.trim()) { setError('Phone number is required.'); return false; }
      if (form.phone.replace(/\D/g, '').length !== 10) { setError('Phone number must be exactly 10 digits.'); return false; }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setError('');
    setStep(s => s + 1);
  };

  const back = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' } };

      // 1. Complete onboarding in one go
      // This saves business profile, tax settings, and invoice settings
      await axios.post(`${API}/onboarding/complete`, {
        businessName: form.businessName,
        tradeName: form.tradeName,
        gstin: form.gstin,
        pan: form.pan,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        stateCode: form.gstin ? form.gstin.substring(0, 2) : '',
        pincode: form.pincode,
        website: form.website,
        // Default settings for a fresh profile
        defaultGstRate: 18,
        enableIgst: true,
        enableRoundOff: true,
        filingFrequency: 'monthly',
        invoicePrefix: 'INV-',
        purchasePrefix: 'PUR-',
        startingNumber: 1,
        showHsn: true,
        showGstBreakup: true
      }, config);

      setSuccess(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c18] p-4 relative overflow-hidden">

      {/* Animated background blobs */}
      <div className="absolute top-0 left-[20%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-[10%] w-[35%] h-[35%] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-[40%] left-[5%] w-[20%] h-[20%] bg-cyan-500/8 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '0.7s' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 w-full max-w-2xl">

        {/* Top logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Cpu size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">InventoryGST</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Set up your IT Business</h1>
          <p className="text-slate-400 mt-2 text-sm">Complete your profile to unlock your smart inventory dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* Top accent bar */}
          <div className="h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />

          {/* Step indicators */}
          <div className="px-8 pt-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isDone = step > s.id;
                return (
                  <div key={s.id} className="flex items-center flex-1">
                    <div className={`flex items-center gap-2 ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isDone ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/30'
                          : isActive ? 'bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-400/50 text-blue-300'
                            : 'bg-white/5 border border-white/10 text-slate-500'
                        }`}>
                        {isDone ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-blue-300' : isDone ? 'text-slate-300' : 'text-slate-600'}`}>
                        {s.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="flex-1 mx-3 h-[1px] bg-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
                          style={{ width: step > s.id ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form body */}
          <div className="px-8 pb-8">

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm animate-pulse">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30 animate-bounce">
                  <CheckCircle2 size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">All Set!</h2>
                <p className="text-slate-400 text-center">Your IT business profile is saved. Taking you to your dashboard…</p>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {!success && (
              <>
                {/* ── STEP 1: Business Info ── */}
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="mb-1">
                      <h2 className="text-xl font-bold text-white">Business Information</h2>
                      <p className="text-slate-400 text-sm mt-0.5">Tell us about your IT company</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative group">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Company Name *</label>
                        <div className="relative">
                          <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            type="text"
                            value={form.businessName}
                            onChange={e => set('businessName', e.target.value)}
                            placeholder="e.g. TechFlow Solutions Pvt. Ltd."
                            className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Trade Name / Brand</label>
                        <div className="relative">
                          <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            type="text"
                            value={form.tradeName}
                            onChange={e => set('tradeName', e.target.value)}
                            placeholder="e.g. TechFlow (optional)"
                            className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="relative group">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">City</label>
                          <div className="relative">
                            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                              type="text"
                              value={form.city}
                              onChange={e => set('city', e.target.value)}
                              placeholder="Bengaluru"
                              className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="relative group">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">State</label>
                          <input
                            type="text"
                            value={form.state}
                            onChange={e => set('state', e.target.value)}
                            placeholder="Karnataka"
                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                          />
                        </div>
                        <div className="relative group">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Pincode</label>
                          <input
                            type="text"
                            value={form.pincode}
                            onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))}
                            placeholder="560001"
                            maxLength={6}
                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Contact & GST ── */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="mb-1">
                      <h2 className="text-xl font-bold text-white">Contact & Tax Details</h2>
                      <p className="text-slate-400 text-sm mt-0.5">For invoices, GST filings, and compliance</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">GSTIN</label>
                          <div className="relative">
                            <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                              type="text"
                              value={form.gstin}
                              onChange={e => {
                                const val = e.target.value.toUpperCase().replace(/\s/g, '');
                                set('gstin', val);
                                // Auto-fill PAN if GSTIN is long enough (chars 3-12)
                                if (val.length >= 12) {
                                  set('pan', val.substring(2, 12));
                                }
                              }}
                              placeholder="29AAACR5055K1Z5"
                              className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="relative group">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">PAN</label>
                          <div className="relative">
                            <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                              type="text"
                              value={form.pan}
                              onChange={e => set('pan', e.target.value.toUpperCase().replace(/\s/g, ''))}
                              placeholder="AAACR5055K"
                              className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Phone <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                              type="tel"
                              value={form.phone}
                              onChange={e => set('phone', e.target.value)}
                              placeholder="e.g. 9876543210 (10 digits)"
                              className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="relative group">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Support Email</label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                              type="email"
                              value={form.email}
                              onChange={e => set('email', e.target.value)}
                              placeholder="support@techflow.in"
                              className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="relative group">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Website</label>
                        <div className="relative">
                          <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input
                            type="url"
                            value={form.website}
                            onChange={e => set('website', e.target.value)}
                            placeholder="https://www.techflow.in"
                            className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm"
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Address</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <textarea
                            value={form.address}
                            onChange={e => set('address', e.target.value)}
                            placeholder="Flat 201, Tech Park, MG Road..."
                            rows={2}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={step === 1 ? () => navigate('/') : back}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors rounded-lg hover:bg-white/5"
                  >
                    <ChevronLeft size={16} />
                    {step === 1 ? "I'll do this later" : 'Back'}
                  </button>

                  {step < STEPS.length ? (
                    <button
                      type="button"
                      onClick={next}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 text-sm"
                    >
                      Continue
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:scale-100 text-sm"
                    >
                      {loading ? (
                        <><Loader2 size={16} className="animate-spin" /> Setting up…</>
                      ) : (
                        <><Sparkles size={16} /> Launch Dashboard</>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step count */}
        {!success && (
          <p className="text-center text-slate-600 text-xs mt-4">Step {step} of {STEPS.length}</p>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
