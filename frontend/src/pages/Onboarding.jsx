import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const Onboarding = () => {
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  const { user, API_URL } = useContext(AuthContext);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = user?.token;
      if (!token) {
        throw new Error('Not authorized. Please login again.');
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      };

      const response = await axios.post(
        `${API_URL}/categories/generate`,
        { industry },
        config
      );

      setSuccessMsg(response.data.message);

      setTimeout(() => {
        navigate('/');
      }, 2500);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate categories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-md w-full space-y-8 bg-white/5 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden">

        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        <div className="text-center relative">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 transform hover:scale-105 transition-transform duration-300">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Level up your shop
          </h2>
          <p className="mt-2 text-slate-400 font-medium">
            AI will generate the best categories for your business.
          </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={handleGenerate}>
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-100 px-4 py-3 rounded-xl animate-shake">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {successMsg ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center text-green-400 bg-green-500/10 border border-green-500/20 p-6 rounded-2xl animate-in zoom-in-95 duration-300">
                <CheckCircle2 size={48} className="mb-4 text-green-500" />
                <p className="text-lg font-bold text-center">{successMsg}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                  Redirecting to dashboard...
                </div>
              </div>
            </div>
          ) : (
            <> R4\
              <div className="space-y-4">
                <div className="Rrelative group">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Car Rental, Tech Gear Shop"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="block w-full px-5 py-4 bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-center text-lg font-medium shadow-inner transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !industry}
                className="group relative w-full flex justify-center items-center py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 disabled:opacity-40"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyzing domain...</span>
                  </div>
                ) : (
                  <>
                    <span>Auto-Magic Setup</span>
                    <Sparkles size={18} className="ml-2 group-hover:scale-125 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors py-2 px-4"
                >
                  I'll do it manually later
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
