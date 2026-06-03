import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { 
  LogOut, Plus, Search, Plane, Home, RefreshCw, Users, MapPin, Layers, 
  Menu, X, ChevronDown, ChevronRight, BarChart, Calendar, TrendingUp,
  ChevronLeft, MessageSquare
} from 'lucide-react';
import api from '../api';
import RecordTable from '../components/RecordTable';
import RecordFormModal from '../components/RecordFormModal';
import SkeletonTable from '../components/SkeletonTable';
import ChatPanel from '../components/ChatPanel';
import { getTodayIST } from '../utils/dateUtils';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const limit = 50;
  const [search, setSearch] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isLocationsOpen, setIsLocationsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');

  // Clear legacy custom options from localStorage to fix "ghost" values
  useEffect(() => {
    localStorage.removeItem('customLocations');
    localStorage.removeItem('customPersons');
  }, []);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [promptConfig, setPromptConfig] = useState({ isOpen: false, type: '', title: '', value: '' });

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch Logic (Task 5)
  const fetchRecords = async ({ page, limit, status, agent, location, search }) => {
    const params = new URLSearchParams({
      page,
      limit,
      ...(status && { status }),
      ...(agent && { agent }),
      ...(location && { location }),
      ...(search && { search }),
    });
    const { data } = await api.get(`/records?${params}`);
    return data;
  };

  const { data: recordsData, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['records', page, statusFilter, personFilter, locationFilter, search],
    queryFn: () => fetchRecords({ 
      page, 
      limit, 
      status: statusFilter, 
      agent: personFilter, 
      location: locationFilter, 
      search 
    }),
    placeholderData: (prev) => prev,
  });

  // Fetch ALL records for sidebar counts and directories (Task 1 + Fix)
  const { data: allRecordsData } = useQuery({
    queryKey: ['all_records_directory'],
    queryFn: async () => {
      const { data } = await api.get('/records?paginate=false');
      return data.data || [];
    },
    staleTime: 60000, // 1 minute
  });

  const records = recordsData?.data || [];
  const allRecords = allRecordsData || [];
  const meta = recordsData?.meta || { total: 0, page: 1, totalPages: 1 };

  // Sync page back to 1 if filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, personFilter, locationFilter, search]);

  const handleCreate = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  }, []);

  const handleSave = async (formData) => {
    try {
      if (editingRecord && editingRecord._id) {
        await api.put(`/records/${editingRecord._id}`, formData);
      } else if (editingRecord && editingRecord._rowIndex) {
        await api.put(`/records/${editingRecord._rowIndex}`, formData);
      } else {
        await api.post('/records', formData);
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries(['records']);
    } catch (error) {
      console.error('Failed to save record', error);
      alert('Failed to save record. Check console.');
    }
  };

  const uniquePersons = useMemo(() => {
    return [...new Set(allRecords.map(r => r["Name of Person"]).filter(Boolean))].sort();
  }, [allRecords]);

  const uniqueLocations = useMemo(() => {
    return [...new Set(allRecords.map(r => r["Location"]).filter(Boolean))].sort();
  }, [allRecords]);


  const getPersonCount = (person) => allRecords.filter(r => r["Name of Person"] === person).length;
  const getLocationCount = (loc) => allRecords.filter(r => r["Location"] === loc).length;

  const handleStatusChange = useCallback(async (record, newStatus) => {
    try {
      const apiPayload = { Status: newStatus };
      if (newStatus === 'Live') {
        apiPayload['Live Date'] = getTodayIST();
      }

      if (record._id) {
        await api.put(`/records/${record._id}`, apiPayload);
      } else if (record._rowIndex) {
        await api.put(`/records/${record._rowIndex}`, apiPayload);
      }
      queryClient.invalidateQueries(['records']);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status.');
    }
  }, [queryClient]);

  const handlePersonChange = useCallback(async (record, newPerson) => {
    try {
      if (record._id) {
        await api.put(`/records/${record._id}`, { "Name of Person": newPerson });
      } else if (record._rowIndex) {
        await api.put(`/records/${record._rowIndex}`, { "Name of Person": newPerson });
      }
      queryClient.invalidateQueries(['records']);
    } catch (error) {
      console.error('Failed to update person', error);
      alert('Failed to update person assignment.');
    }
  }, [queryClient]);

  return (
    <div className="max-h-screen min-h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-50 sticky top-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            <div className="flex items-center space-x-3 lg:w-[240px]">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-slate-500 hover:text-brand-600 transition-colors hidden md:block"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 text-slate-500 hover:text-brand-600 transition-colors"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-md">
                <Plane className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight hidden sm:block">Fusionstays</span>
            </div>

            <div className="flex-1 max-w-xl mx-4 hidden md:block">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  list="search-suggestions"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search globally by property..."
                  className="w-full bg-slate-100 border border-transparent rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <datalist id="search-suggestions">
                  {useMemo(() => {
                    const props = [...new Set(allRecords.map(r => r["Property Name"]).filter(Boolean))].slice(0, 10);
                    const locs = [...new Set(allRecords.map(r => r["Location"]).filter(Boolean))].slice(0, 10);
                    return [...props, ...locs].map(item => <option key={item} value={item} />);
                  }, [allRecords])}
                </datalist>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 lg:w-[240px] flex-shrink-0">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700">{user?.email}</span>
                <div className="flex items-center text-xs text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                  Online
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(true)}
                className="relative text-slate-500 hover:text-brand-600 transition-all flex items-center p-2 rounded-lg hover:bg-slate-100"
                title="Team Chat"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-brand-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
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

      {/* Main Layout Container */}
      <div className="flex flex-1 w-full max-w-[1600px] mx-auto overflow-hidden relative">

        {!isSidebarOpen && !isSidebarHovered && (
          <div
            className="fixed left-0 top-16 bottom-0 w-8 z-30 hidden lg:block cursor-e-resize"
            onMouseEnter={() => setIsSidebarHovered(true)}
          ></div>
        )}

        {(isSidebarOpen || isSidebarHovered) && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-30 lg:bg-transparent backdrop-blur-sm transition-opacity"
            onClick={() => { setIsSidebarOpen(false); setIsSidebarHovered(false); }}
          ></div>
        )}

        <aside
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`fixed top-16 z-40 w-72 bg-white border-r border-slate-200 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar transform transition-all duration-300 ease-in-out flex-shrink-0 ${isSidebarOpen || isSidebarHovered ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
        >
          <div className="p-4 space-y-6">

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Overview</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => { setPersonFilter(''); setLocationFilter(''); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${(!personFilter && !locationFilter) ? 'bg-brand-50 text-brand-700 font-semibold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                  >
                    <div className="flex items-center">
                      <Layers className={`w-5 h-5 mr-3 ${(!personFilter && !locationFilter) ? 'text-brand-500' : 'text-slate-400'}`} />
                      All Properties
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">{allRecords.length}</span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="px-3">
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-brand-600 to-indigo-600 rounded-2xl text-white shadow-lg hover:shadow-brand-200/50 transition-all transform hover:-translate-y-1 active:scale-95 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                    <BarChart className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold leading-tight">Report Dashboard</div>
                    <div className="text-[10px] text-brand-100 font-medium">View detailed stats</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-brand-200" />
              </button>
            </div>

            {user?.role === 'admin' && (
              <>
                <div className="px-3">
                  <button
                    onClick={() => navigate('/dropdown-manager')}
                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 shadow-sm hover:bg-slate-50 transition-all transform hover:-translate-y-1 active:scale-95 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-slate-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold leading-tight">Dropdown Settings</div>
                        <div className="text-[10px] text-slate-400 font-medium">Manage options list</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                </div>

                <div className="px-3">
                  <button
                    onClick={() => navigate('/user-management')}
                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl text-slate-700 shadow-sm hover:bg-slate-50 transition-all transform hover:-translate-y-1 active:scale-95 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-slate-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold leading-tight">User Management</div>
                        <div className="text-[10px] text-slate-400 font-medium">Manage team accounts</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </button>
                </div>
              </>
            )}


          </div>
        </aside>

        <main className={`flex-1 w-full bg-slate-50/50 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-y-auto h-[calc(100vh-64px)] relative transition-all duration-300 ${isSidebarOpen ? 'lg:pl-80' : 'pl-4'}`}>
          <div className="w-full">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">

              <div className="flex flex-wrap gap-2 items-center flex-1">
                <h1 className="text-2xl font-bold text-slate-800 mr-2 sm:mr-4">Database</h1>

                {locationFilter && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm animate-fade-in">
                    Location: {locationFilter}
                    <button onClick={() => setLocationFilter('')} className="ml-2 hover:text-indigo-900 focus:outline-none"><X className="w-3.5 h-3.5" /></button>
                  </span>
                )}
                {personFilter && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-fade-in">
                    Agent: {personFilter}
                    <button onClick={() => setPersonFilter('')} className="ml-2 hover:text-emerald-900 focus:outline-none"><X className="w-3.5 h-3.5" /></button>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="md:hidden relative group flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    list="search-suggestions-mobile"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
                  />
                  <datalist id="search-suggestions-mobile">
                    {useMemo(() => {
                      const props = [...new Set(allRecords.map(r => r["Property Name"]).filter(Boolean))].slice(0, 10);
                      const locs = [...new Set(allRecords.map(r => r["Location"]).filter(Boolean))].slice(0, 10);
                      return [...props, ...locs].map(item => <option key={item} value={item} />);
                    }, [allRecords])}
                  </datalist>
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl py-2.5 pl-4 pr-10 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm appearance-none transition-colors"
                  >
                    <option value="">All Statuses</option>
                    <option value="Yet to Call">Yet to Call</option>
                    <option value="Called">Called</option>
                    <option value="Declined">Declined</option>
                    <option value="Pending for QC">Pending for QC</option>
                    <option value="Follow up">Follow up</option>
                    <option value="Live">Live</option>
                    <option value="Called but didn't answer">Called but didn't answer</option>
                    <option value="QC Reject">QC Reject</option>
                    <option value="Not needed">Not needed</option>
                    <option value="Full Details Received">Full Details Received</option>
                    <option value="In draft">In draft</option>
                    <option value="already live">already live</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={personFilter}
                    onChange={(e) => setPersonFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl py-2.5 pl-4 pr-10 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm appearance-none transition-colors"
                  >
                    <option value="">All Agents</option>
                    {uniquePersons.map(person => (
                      <option key={person} value={person}>{person}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                <button
                  onClick={() => refetch()}
                  className="p-2.5 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm focus:outline-none flex-shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin text-brand-500' : ''}`} />
                </button>
                <button
                  onClick={() => navigate('/leads')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl py-2.5 px-5 shadow-md hover:shadow-lg transition-all flex items-center flex-shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Layers className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Internal Lead</span>
                </button>
                <button
                  onClick={handleCreate}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-2.5 px-5 shadow-md hover:shadow-lg transition-all flex items-center flex-shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Record</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 relative min-h-[500px] flex flex-col">
              {isLoading ? (
                <SkeletonTable rows={10} cols={6} />
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-5 border border-rose-100">
                    <X className="w-10 h-10 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Fetch Error</h3>
                  <p className="text-slate-500 max-w-sm mb-6">{error?.message || 'Failed to load records'}</p>
                  <button onClick={() => refetch()} className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold">Retry</button>
                </div>
              ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-5 border border-slate-200">
                    <Home className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No properties found</h3>
                  <p className="text-slate-500 max-w-sm mb-6">No records match your active filters.</p>
                  <button
                    onClick={() => { setSearch(''); setLocationFilter(''); setPersonFilter(''); setStatusFilter(''); }}
                    className="text-brand-700 bg-brand-50 py-2.5 px-6 rounded-full font-bold transition-all hover:bg-brand-600 hover:text-white"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <RecordTable
                      records={records}
                      onEdit={handleEdit}
                      onStatusChange={handleStatusChange}
                      onPersonChange={handlePersonChange}
                      uniquePersons={uniquePersons}
                    />
                  </div>
                  
                  {/* Pagination Controls */}
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="text-sm text-slate-500 font-medium">
                      Showing <span className="text-slate-800 font-bold">{(meta.page - 1) * meta.limit + 1}</span> to <span className="text-slate-800 font-bold">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="text-slate-800 font-bold">{meta.total}</span> records
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={meta.page === 1}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, meta.totalPages) }).map((_, i) => {
                          const p = i + 1; // Simplified for demo
                          return (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${meta.page === p ? 'bg-brand-600 text-white shadow-md shadow-brand-200' : 'hover:bg-white text-slate-600'}`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                        disabled={meta.page === meta.totalPages}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </main>
      </div>

      {isModalOpen && (
        <RecordFormModal
          record={editingRecord}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          user={user}
          uniqueLocations={uniqueLocations}
          uniquePersons={uniquePersons}
        />
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-brand-600 hover:bg-brand-700 text-white p-4 rounded-full shadow-lg hover:shadow-brand-300 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
        title="Open Team Chat"
      >
        <MessageSquare className="w-6 h-6" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
            {unreadCount}
          </span>
        ) : (
          <span className="absolute right-full mr-2 bg-slate-800 text-white text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm">
            Chat with Team
          </span>
        )}
      </button>

      {/* Slide-out Chat Drawer */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </div>
  );
};

export default Dashboard;
