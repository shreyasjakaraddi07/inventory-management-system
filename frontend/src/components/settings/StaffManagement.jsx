import { useState, useEffect, useCallback } from 'react';
import { Users, Trash2, Shield, ShieldOff, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8080/api';

const StaffManagement = ({ user }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const response = await axios.get(`${API}/settings/staff`, config);
      setStaff(response.data.data || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
      setError(err.response?.data?.message || 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStaff();
    }
  }, [user, fetchStaff]);

  const handleToggleAccess = async (id, currentStatus) => {
    try {
      setActionLoading(id);
      setError('');
      setSuccess('');
      const newStatus = currentStatus === 1 ? 0 : 1;
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      
      await axios.put(`${API}/settings/staff/${id}/toggle`, { is_active: newStatus }, config);
      
      setStaff(prev =>
        prev.map(member => (member.ID === id ? { ...member, IS_ACTIVE: newStatus } : member))
      );
      setSuccess(`Staff access updated successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error toggling staff access:', err);
      setError(err.response?.data?.message || 'Failed to update staff access.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your staff? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(id);
      setError('');
      setSuccess('');
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      
      await axios.delete(`${API}/settings/staff/${id}`, config);
      
      setStaff(prev => prev.filter(member => member.ID !== id));
      setSuccess(`Staff member ${name} has been removed.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting staff member:', err);
      setError(err.response?.data?.message || 'Failed to remove staff member.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStaff = staff.filter(member => 
    member.NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.EMAIL.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Staff Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Control staff account access and remove staff from your business</p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2 animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-800 dark:text-emerald-200">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span className="text-rose-800 dark:text-rose-200">{error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name or Gmail..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button
          onClick={fetchStaff}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Refresh List
        </button>
      </div>

      {/* Staff List Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <span className="text-sm">Loading staff members...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-base font-medium">No staff members found</p>
            <p className="text-xs mt-1">Staff accounts can register by selecting "Staff" and providing your owner credentials.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Gmail ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-sm">
                {filteredStaff.map(member => (
                  <tr key={member.ID} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold uppercase shadow-sm">
                        {member.NAME.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{member.NAME}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-xs">{member.EMAIL}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        member.IS_ACTIVE === 1 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                      }`}>
                        {member.IS_ACTIVE === 1 ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* Toggle Access Button */}
                        <button
                          disabled={actionLoading === member.ID}
                          onClick={() => handleToggleAccess(member.ID, member.IS_ACTIVE)}
                          title={member.IS_ACTIVE === 1 ? "Deactivate Access" : "Activate Access"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            member.IS_ACTIVE === 1
                              ? 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10'
                              : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                          }`}
                        >
                          {actionLoading === member.ID ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : member.IS_ACTIVE === 1 ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          disabled={actionLoading === member.ID}
                          onClick={() => handleDeleteStaff(member.ID, member.NAME)}
                          title="Remove Staff"
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                          {actionLoading === member.ID ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
