import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Users, Plus, Trash2, Shield, ShieldAlert, Ban, CheckCircle, 
  ArrowLeft, LogOut, Plane, Menu, X, KeyRound, Loader2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import api from '../api';

const UserManagement = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // stores user email currently being updated
  
  // UI Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(null); // stores user object
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [status, setStatus] = useState('active');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!email || !password) {
      setFormError('Email and Password are required.');
      return;
    }
    
    try {
      await api.post('/users', { email, password, role, status });
      setShowAddModal(false);
      setEmail('');
      setPassword('');
      setRole('user');
      setStatus('active');
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  // Handle Toggle Status (Active / Suspended)
  const handleToggleStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    setActionLoading(targetUser.email);
    try {
      await api.put(`/users/${targetUser.email}`, { status: newStatus });
      setUsers(users.map(u => u.email === targetUser.email ? { ...u, status: newStatus } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Role Toggle (Admin / User)
  const handleToggleRole = async (targetUser) => {
    // Prevent self role change to avoid accidental lockouts
    if (targetUser.email.toLowerCase() === user.email.toLowerCase()) {
      alert("You cannot change your own role to prevent lockout.");
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change ${targetUser.email}'s role to ${newRole}?`)) {
      return;
    }

    setActionLoading(targetUser.email);
    try {
      await api.put(`/users/${targetUser.email}`, { role: newRole });
      setUsers(users.map(u => u.email === targetUser.email ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;

    setActionLoading(showPasswordModal.email);
    try {
      await api.put(`/users/${showPasswordModal.email}`, { password: newPassword });
      setShowPasswordModal(null);
      setNewPassword('');
      alert("Password updated successfully.");
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (targetEmail) => {
    if (targetEmail.toLowerCase() === user.email.toLowerCase()) {
      alert("You cannot delete your own account.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the user account for ${targetEmail}? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(targetEmail);
    try {
      await api.delete(`/users/${targetEmail}`);
      setUsers(users.filter(u => u.email !== targetEmail));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-h-screen min-h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-50 sticky top-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-500 hover:text-brand-600 transition-colors flex items-center gap-1 font-semibold text-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-md">
                <Users className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">User Administration</span>
            </div>

            <div className="flex items-center justify-end space-x-6">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700">{user?.email}</span>
                <span className="text-xs text-brand-600 font-bold capitalize">{user?.role} Mode</span>
              </div>
              <button
                onClick={logout}
                className="text-slate-500 hover:text-red-500 transition-colors flex items-center p-2 rounded-lg hover:bg-red-50"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:py-8 overflow-y-auto h-[calc(100vh-64px)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Team Accounts</h1>
            <p className="text-slate-500 text-sm mt-1">Manage agent logins, access levels (roles), and account status.</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-2.5 px-5 shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* User Accounts List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Loading user registry...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100">
                <AlertCircle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Failed to Load Users</h3>
              <p className="text-slate-500 text-sm max-w-sm mb-5">{error}</p>
              <button onClick={fetchUsers} className="bg-brand-600 text-white px-5 py-2 rounded-xl font-semibold">Retry</button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-slate-500 italic">No users found. Click 'Create New User' to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">User Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((item) => {
                    const isSelf = item.email.toLowerCase() === user.email.toLowerCase();
                    const isUserActionLoading = actionLoading === item.email;

                    return (
                      <tr key={item.email} className={`hover:bg-slate-50/50 transition-colors ${isSelf ? 'bg-brand-50/20' : ''}`}>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{item.email}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleRole(item)}
                            disabled={isSelf || isUserActionLoading}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              item.role === 'admin' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            } ${isSelf ? 'cursor-not-allowed opacity-80' : 'hover:scale-105'}`}
                          >
                            {item.role === 'admin' ? <Shield className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            <span className="capitalize">{item.role}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={isSelf || isUserActionLoading}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              item.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            } ${isSelf ? 'cursor-not-allowed opacity-80' : 'hover:scale-105'}`}
                          >
                            {item.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                            <span className="capitalize">{item.status}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {item.createdAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(item.createdAt)) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShowPasswordModal(item)}
                              disabled={isUserActionLoading}
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(item.email)}
                              disabled={isSelf || isUserActionLoading}
                              className={`p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${
                                isSelf ? 'opacity-30 cursor-not-allowed' : ''
                              }`}
                              title="Delete Account"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Add New Team User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">User Email Address</label>
                <input
                  type="email"
                  required
                  autoComplete="new-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. agent@fusionstays.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-semibold"
                  >
                    <option value="user">User (Agent)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md transition-all"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-scale-up">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Reset User Password</h3>
              <button onClick={() => setShowPasswordModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span>You are resetting the password for <strong>{showPasswordModal.email}</strong>. Please communicate the new password to them securely.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {actionLoading === showPasswordModal.email && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
