import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Users, Plus, Trash2, Shield, ShieldAlert, Ban, CheckCircle, 
  ArrowLeft, LogOut, Plane, Menu, X, KeyRound, Loader2, AlertCircle, Eye, EyeOff, Edit3, ChevronDown
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';

const UserManagement = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // stores user email currently being updated

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(null); // stores user object
  const [showEditModal, setShowEditModal] = useState(null); // stores user object being edited
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editStatus, setEditStatus] = useState('active');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('prop_add');
  const [status, setStatus] = useState('active');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const generatedUsername = fullName.trim() 
    ? `${fullName.trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}@workspace.com` 
    : '';

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
    if (!fullName.trim() || !password) {
      setFormError('Full Name and Password are required.');
      return;
    }
    
    try {
      await api.post('/users', { fullName: fullName.trim(), password, role, status });
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('user');
      setStatus('active');
      fetchUsers();
      queryClient.invalidateQueries(['dropdowns']);
      queryClient.invalidateQueries(['usersList']);
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

  // Handle Role Selection (Admin / Prop/Add / Team Member)
  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.email.toLowerCase() === user.email.toLowerCase()) {
      alert("You cannot change your own role to prevent lockout.");
      return;
    }
    if (targetUser.role === newRole) return;

    setActionLoading(targetUser.email);
    try {
      await api.put(`/users/${targetUser.email}`, { role: newRole });
      setUsers(users.map(u => u.email === targetUser.email ? { ...u, role: newRole } : u));
      queryClient.invalidateQueries(['usersList']);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Credentials Modal
  const handleOpenEditModal = (targetUser) => {
    setShowEditModal(targetUser);
    setEditName(targetUser.name || (targetUser.email ? targetUser.email.split('@')[0] : ''));
    setEditRole(targetUser.role || 'prop_add');
    setEditStatus(targetUser.status || 'active');
    setEditPassword('');
  };

  // Handle Save Edit Credentials
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!showEditModal) return;

    setActionLoading(showEditModal.email);
    try {
      const payload = {
        name: editName,
        role: editRole,
        status: editStatus
      };
      if (editPassword && editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await api.put(`/users/${showEditModal.email}`, payload);
      setUsers(users.map(u => u.email === showEditModal.email ? { ...u, ...payload } : u));
      setShowEditModal(null);
      setEditPassword('');
      queryClient.invalidateQueries(['usersList']);
      alert("User credentials updated successfully.");
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user credentials.');
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
    <div className="max-h-screen min-h-screen bg-[#F4F5F7] font-sans flex flex-col overflow-hidden text-[#4A4A4A] relative">
      {/* Soft Light Grey Ambient Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#6D8196]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#CBCBCB]/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="bg-[#4A4A4A] border-b border-[#6D8196]/30 z-50 sticky top-0 shadow-md text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-[#CBCBCB] hover:text-white transition-colors flex items-center gap-1 font-semibold text-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-[#CBCBCB]/30 hidden sm:block"></div>
              <div className="w-10 h-10 bg-[#6D8196] rounded-xl flex items-center justify-center shadow-md border border-[#CBCBCB]/30">
                <Users className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">User Administration</span>
            </div>

            <div className="flex items-center justify-end space-x-6">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-white">{user?.email}</span>
                <span className="text-xs text-[#CBCBCB] font-bold capitalize">{user?.role} Mode</span>
              </div>
              <button
                onClick={logout}
                className="text-[#CBCBCB] hover:text-rose-300 hover:bg-[#6D8196]/30 transition-colors flex items-center p-2 rounded-lg"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:py-8 overflow-y-auto h-[calc(100vh-64px)] z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#4A4A4A] tracking-tight">Team Accounts</h1>
            <p className="text-[#6D8196] text-sm mt-1">Manage agent logins, access levels (roles), and account status.</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#6D8196] hover:bg-[#4A4A4A] text-white font-bold border border-[#CBCBCB]/50 rounded-xl py-2.5 px-5 shadow-md hover:shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* User Accounts List Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#CBCBCB] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#6D8196] animate-spin mb-3" />
              <p className="text-[#6D8196] text-sm font-semibold">Loading user registry...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-200">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-[#4A4A4A] mb-1">Failed to Load Users</h3>
              <p className="text-[#6D8196] text-sm max-w-sm mb-5">{error}</p>
              <button onClick={fetchUsers} className="bg-[#6D8196] text-white px-5 py-2 rounded-xl font-semibold border border-[#CBCBCB]">Retry</button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-[#6D8196] italic">No users found. Click 'Create New User' to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#6D8196] text-white border-b border-[#4A4A4A]/20 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">User Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCBCB]/40 text-sm">
                  {users.map((item) => {
                    const isSelf = item.email.toLowerCase() === user.email.toLowerCase();
                    const isUserActionLoading = actionLoading === item.email;

                    return (
                      <tr key={item.email} className={`hover:bg-[#F4F5F7] transition-colors ${isSelf ? 'bg-[#F4F5F7]/70' : ''}`}>
                        <td className="px-6 py-4 font-bold text-[#4A4A4A]">
                          <div className="flex items-center gap-2">
                            <span>{item.email}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-[#6D8196] text-white px-2 py-0.5 rounded-full font-bold">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative inline-block">
                            <select
                              value={item.role}
                              disabled={isSelf || isUserActionLoading}
                              onChange={(e) => handleRoleChange(item, e.target.value)}
                              className={`appearance-none flex items-center gap-1.5 px-3 py-1 pr-7 rounded-full text-xs font-bold transition-all cursor-pointer border focus:outline-none focus:ring-2 focus:ring-[#6D8196] ${
                                item.role === 'admin' 
                                  ? 'bg-[#4A4A4A] text-white border-[#6D8196]' 
                                  : item.role === 'team_member'
                                  ? 'bg-[#CBCBCB] text-[#4A4A4A] border-[#6D8196]'
                                  : 'bg-[#6D8196] text-white border-[#CBCBCB]'
                              } ${isSelf ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                              <option value="admin" className="bg-[#4A4A4A] text-white">Admin</option>
                              <option value="prop_add" className="bg-[#6D8196] text-white">Prop/Add</option>
                              <option value="team_member" className="bg-[#CBCBCB] text-[#4A4A4A]">Team Member</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={isSelf || isUserActionLoading}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              item.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            } ${isSelf ? 'cursor-not-allowed opacity-80' : 'hover:scale-105'}`}
                          >
                            {item.status === 'active' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Ban className="w-3 h-3 text-rose-600" />}
                            <span className="capitalize">{item.status}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-[#6D8196] font-semibold">
                          {item.createdAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(item.createdAt)) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              disabled={isUserActionLoading}
                              className="p-2 text-[#6D8196] hover:text-[#4A4A4A] hover:bg-[#CBCBCB]/30 rounded-lg transition-colors"
                              title="Edit User Credentials"
                            >
                              <Edit3 className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => setShowPasswordModal(item)}
                              disabled={isUserActionLoading}
                              className="p-2 text-[#6D8196] hover:text-[#4A4A4A] hover:bg-[#CBCBCB]/30 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(item.email)}
                              disabled={isSelf || isUserActionLoading}
                              className={`p-2 text-[#6D8196] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${
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
        <div className="fixed inset-0 bg-[#4A4A4A]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#CBCBCB] transform transition-all animate-scale-up text-[#4A4A4A]">
            <div className="px-6 py-4 bg-[#6D8196] text-white border-b border-[#4A4A4A]/20 flex justify-between items-center">
              <h3 className="font-bold text-lg">Add New Team User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white hover:opacity-80"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] placeholder-[#6D8196]/50 focus:ring-2 focus:ring-[#6D8196] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all font-semibold"
                />
                {generatedUsername && (
                  <p className="text-xs text-[#6D8196] font-semibold mt-1.5 flex items-center gap-1">
                    <span>Generated Login Username:</span>
                    <code className="bg-[#F4F5F7] text-[#4A4A4A] px-2 py-0.5 rounded border border-[#CBCBCB] font-bold">{generatedUsername}</code>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] placeholder-[#6D8196]/50 focus:ring-2 focus:ring-[#6D8196] rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none transition-all font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D8196] hover:text-[#4A4A4A] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">Role Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D8196] transition-all font-semibold"
                  >
                    <option value="admin">Admin</option>
                    <option value="prop_add">Prop/Add</option>
                    <option value="team_member">Team Member</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D8196] transition-all font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#CBCBCB] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#4A4A4A] hover:bg-[#CBCBCB]/40 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#6D8196] hover:bg-[#4A4A4A] border border-[#CBCBCB] rounded-xl shadow-md transition-all"
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
        <div className="fixed inset-0 bg-[#4A4A4A]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#CBCBCB] transform transition-all animate-scale-up text-[#4A4A4A]">
            <div className="px-6 py-4 bg-[#6D8196] text-white border-b border-[#4A4A4A]/20 flex justify-between items-center">
              <h3 className="font-bold text-lg">Reset User Password</h3>
              <button onClick={() => setShowPasswordModal(null)} className="text-white hover:opacity-80"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span>You are resetting the password for <strong>{showPasswordModal.email}</strong>. Please communicate the new password to them securely.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] placeholder-[#6D8196]/50 focus:ring-2 focus:ring-[#6D8196] rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none transition-all font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D8196] hover:text-[#4A4A4A] transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#CBCBCB] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#4A4A4A] hover:bg-[#CBCBCB]/40 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#6D8196] hover:bg-[#4A4A4A] border border-[#CBCBCB] rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {actionLoading === showPasswordModal.email && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Credentials Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-[#4A4A4A]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-[#CBCBCB] transform transition-all animate-scale-up text-[#4A4A4A]">
            <div className="px-6 py-4 bg-[#6D8196] text-white border-b border-[#4A4A4A]/20 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Edit User Credentials</h3>
                <p className="text-xs text-slate-100 font-medium">{showEditModal.email}</p>
              </div>
              <button onClick={() => setShowEditModal(null)} className="text-white hover:opacity-80"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">Display Name (First Name)</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Shubhra"
                  className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] placeholder-[#6D8196]/50 focus:ring-2 focus:ring-[#6D8196] rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">New Password (Leave blank to keep current)</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password if changing"
                    className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] placeholder-[#6D8196]/50 focus:ring-2 focus:ring-[#6D8196] rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none transition-all font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6D8196] hover:text-[#4A4A4A] transition-colors"
                  >
                    {showEditPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">Role Type</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D8196] transition-all font-semibold"
                  >
                    <option value="admin">Admin</option>
                    <option value="prop_add">Prop/Add</option>
                    <option value="team_member">Team Member</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-2">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-[#F4F5F7] border border-[#CBCBCB] text-[#4A4A4A] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D8196] transition-all font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#CBCBCB] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#4A4A4A] hover:bg-[#CBCBCB]/40 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === showEditModal.email}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#6D8196] hover:bg-[#4A4A4A] border border-[#CBCBCB] rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {actionLoading === showEditModal.email && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Changes</span>
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
