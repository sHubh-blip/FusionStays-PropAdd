import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Plus, Search, Plane, Home, RefreshCw, Users, MapPin, Layers, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../api';
import RecordTable from '../components/RecordTable';
import RecordFormModal from '../components/RecordFormModal';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // App State
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
  const [customLocations, setCustomLocations] = useState(() => JSON.parse(localStorage.getItem('customLocations') || '[]'));
  const [customPersons, setCustomPersons] = useState(() => JSON.parse(localStorage.getItem('customPersons') || '[]'));
  
  // Custom Prompt Modal State
  const [promptConfig, setPromptConfig] = useState({ isOpen: false, type: '', title: '', value: '' });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data } = await api.get('/records');
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => (Number(b._rowIndex) || 0) - (Number(a._rowIndex) || 0))
        : [];
      setRecords(sorted);
    } catch (error) {
      console.error('Failed to fetch records', error);
      setFetchError(error.response?.data?.message || error.message || 'Failed to connect to backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

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
      fetchRecords(); 
    } catch (error) {
      console.error('Failed to save record', error);
      alert('Failed to save record. Check console.');
    }
  };

  const uniquePersons = useMemo(() => {
    return [...new Set([...records.map(r => r["Name of Person"]), ...customPersons].filter(Boolean))].sort();
  }, [records, customPersons]);
  
  const uniqueLocations = useMemo(() => {
    return [...new Set([...records.map(r => r["Location"]), ...customLocations].filter(Boolean))].sort();
  }, [records, customLocations]);

  const handleAddLocation = (e) => {
    e.stopPropagation();
    setPromptConfig({ isOpen: true, type: 'location', title: 'Add New Location', value: '' });
  };

  const handleAddPerson = (e) => {
    e.stopPropagation();
    setPromptConfig({ isOpen: true, type: 'person', title: 'Add New Team Member', value: '' });
  };

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    const val = promptConfig.value.trim();
    if (val) {
      if (promptConfig.type === 'location') {
        setCustomLocations(prev => {
          const next = [...prev, val];
          localStorage.setItem('customLocations', JSON.stringify(next));
          return next;
        });
      } else {
        setCustomPersons(prev => {
          const next = [...prev, val];
          localStorage.setItem('customPersons', JSON.stringify(next));
          return next;
        });
      }
    }
    setPromptConfig({ isOpen: false, type: '', title: '', value: '' });
  };

  const getPersonCount = (person) => records.filter(r => r["Name of Person"] === person).length;
  const getLocationCount = (loc) => records.filter(r => r["Location"] === loc).length;

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      let matchesSearch = true;
      if (search) {
        const s = search.toLowerCase();
        const name = record["Name of property"]?.toLowerCase() || "";
        const loc = record["Location"]?.toLowerCase() || "";
        matchesSearch = name.includes(s) || loc.includes(s);
      }
      
      let matchesPerson = true;
      if (personFilter) {
        matchesPerson = record["Name of Person"] === personFilter;
      }

      let matchesLocation = true;
      if (locationFilter) {
        matchesLocation = record["Location"] === locationFilter;
      }
      let matchesStatus = true;
      if (statusFilter) {
        matchesStatus = record["Status"] === statusFilter;
      }

      return matchesSearch && matchesPerson && matchesLocation && matchesStatus;
    });
  }, [records, search, personFilter, locationFilter, statusFilter]);

  const handleStatusChange = useCallback(async (record, newStatus) => {
    try {
      const updatedRecord = { ...record, Status: newStatus };
      
      // Automatically update the Live Date if marked 'Live'
      if (newStatus === 'Live') {
        updatedRecord['Live Date'] = new Date().toISOString().split('T')[0];
      }

      setRecords(prev => prev.map(r => r._id === record._id && r._rowIndex === record._rowIndex ? updatedRecord : r));

      const apiPayload = { Status: newStatus };
      if (newStatus === 'Live') {
        apiPayload['Live Date'] = updatedRecord['Live Date'];
      }

      if (record._id) {
        await api.put(`/records/${record._id}`, apiPayload);
      } else if (record._rowIndex) {
        await api.put(`/records/${record._rowIndex}`, apiPayload);
      }
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status. Check configuration.');
      fetchRecords();
    }
  }, []);

  const handlePersonChange = useCallback(async (record, newPerson) => {
    try {
      const updatedRecord = { ...record, "Name of Person": newPerson };
      setRecords(prev => prev.map(r => r._id === record._id && r._rowIndex === record._rowIndex ? updatedRecord : r));

      if (record._id) {
        await api.put(`/records/${record._id}`, { "Name of Person": newPerson });
      } else if (record._rowIndex) {
        await api.put(`/records/${record._rowIndex}`, { "Name of Person": newPerson });
      }
    } catch (error) {
      console.error('Failed to update person', error);
      alert('Failed to update person assignment. Check configuration.');
      fetchRecords(); // Revert on failure
    }
  }, []);

  return (
    <div className="max-h-screen min-h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-50 sticky top-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            <div className="flex items-center space-x-3 lg:w-[240px]">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-slate-500 hover:text-brand-600 transition-colors hidden md:block" // Force hamburger on all screens since it's collapsible
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search globally by property..."
                  className="w-full bg-slate-100 border border-transparent rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-6 lg:w-[240px] flex-shrink-0">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700">{user?.email}</span>
                <div className="flex items-center text-xs text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                  Online
                </div>
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

      {/* Main Layout Container */}
      <div className="flex flex-1 w-full max-w-[1600px] mx-auto overflow-hidden relative">
        
        {/* Invisible Hover Trigger for Desktop */}
        {!isSidebarOpen && !isSidebarHovered && (
          <div 
            className="fixed left-0 top-16 bottom-0 w-8 z-30 hidden lg:block cursor-e-resize"
            onMouseEnter={() => setIsSidebarHovered(true)}
          ></div>
        )}

        {/* Sidebar Overlay for Mobile */}
        {(isSidebarOpen || isSidebarHovered) && (
          <div 
            className="fixed inset-0 bg-slate-900/40 z-30 lg:bg-transparent backdrop-blur-sm transition-opacity" 
            onClick={() => { setIsSidebarOpen(false); setIsSidebarHovered(false); }}
          ></div>
        )}

        {/* Sidebar */}
        <aside 
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`fixed top-16 z-40 w-72 bg-white border-r border-slate-200 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar transform transition-all duration-300 ease-in-out flex-shrink-0 ${isSidebarOpen || isSidebarHovered ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
        >
          <div className="p-4 space-y-6">
            
            {/* Overview */}
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
                    <span className="bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-bold">{records.length}</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Locations Directory Dropdown */}
            {uniqueLocations.length > 0 && (
              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl overflow-hidden transition-all">
                <button 
                  onClick={() => setIsLocationsOpen(!isLocationsOpen)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-bold text-slate-700">Locations Directory</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-medium">{uniqueLocations.length} Regions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div 
                      onClick={handleAddLocation}
                      className="p-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                      title="Add Location"
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                    {isLocationsOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {isLocationsOpen && (
                  <div className="p-2 space-y-2 border-t border-slate-100">
                    <div className="px-2 pb-1 relative group pt-1">
                      <Search className="w-3.5 h-3.5 absolute left-4 top-3 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search locations..." 
                        value={locationSearch} 
                        onChange={(e) => setLocationSearch(e.target.value)} 
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2 pl-7 pr-3 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
                      />
                    </div>
                    <ul className="space-y-1 max-h-[250px] overflow-y-auto px-1 custom-scrollbar">
                      {uniqueLocations.filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase())).map(loc => (
                        <li key={loc}>
                          <button 
                            onClick={() => { setLocationFilter(locationFilter === loc ? '' : loc); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${locationFilter === loc ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900 font-medium'}`}
                          >
                            <div className="flex items-center truncate">
                              <MapPin className={`w-4 h-4 mr-2.5 flex-shrink-0 ${locationFilter === loc ? 'text-brand-500' : 'text-slate-400'}`} />
                              <span className="truncate text-xs">{loc}</span>
                            </div>
                            <span className={`py-0.5 px-2 rounded-full text-[10px] font-bold flex-shrink-0 ml-2 ${locationFilter === loc ? 'bg-brand-100 text-brand-700' : 'bg-slate-200/70 text-slate-500'}`}>
                              {getLocationCount(loc)}
                            </span>
                          </button>
                        </li>
                      ))}
                      {uniqueLocations.filter(loc => loc.toLowerCase().includes(locationSearch.toLowerCase())).length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400">No locations found</div>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Users Directory Dropdown */}
            {uniquePersons.length > 0 && (
              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl overflow-hidden transition-all">
                <button 
                  onClick={() => setIsTeamOpen(!isTeamOpen)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-bold text-slate-700">Team Directory</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-medium">{uniquePersons.length} Members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div 
                      onClick={handleAddPerson}
                      className="p-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                      title="Add Member"
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                    {isTeamOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {isTeamOpen && (
                  <div className="p-2 space-y-2 border-t border-slate-100">
                    <div className="px-2 pb-1 relative group pt-1">
                      <Search className="w-3.5 h-3.5 absolute left-4 top-3 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search team members..." 
                        value={teamSearch} 
                        onChange={(e) => setTeamSearch(e.target.value)} 
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2 pl-7 pr-3 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
                      />
                    </div>
                    <ul className="space-y-1 max-h-[250px] overflow-y-auto px-1 custom-scrollbar">
                      {uniquePersons.filter(person => person.toLowerCase().includes(teamSearch.toLowerCase())).map(person => (
                        <li key={person}>
                          <button 
                            onClick={() => { setPersonFilter(personFilter === person ? '' : person); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${personFilter === person ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900 font-medium'}`}
                          >
                            <div className="flex items-center truncate">
                              <Users className={`w-4 h-4 mr-2.5 flex-shrink-0 ${personFilter === person ? 'text-brand-500' : 'text-slate-400'}`} />
                              <span className="truncate text-xs">{person}</span>
                            </div>
                            <span className={`py-0.5 px-2 rounded-full text-[10px] font-bold flex-shrink-0 ml-2 ${personFilter === person ? 'bg-brand-100 text-brand-700' : 'bg-slate-200/70 text-slate-500'}`}>
                              {getPersonCount(person)}
                            </span>
                          </button>
                        </li>
                      ))}
                      {uniquePersons.filter(person => person.toLowerCase().includes(teamSearch.toLowerCase())).length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400">No members found</div>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </aside>

        {/* Feed / Main Content */}
        <main className={`flex-1 w-full bg-slate-50/50 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-y-auto h-[calc(100vh-64px)] relative transition-all duration-300 ${isSidebarOpen ? 'lg:pl-80' : 'pl-4'}`}>
          <div className="w-full">
            
            {/* Page Utilities (Mobile Search & Actions) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              
              {/* Filter active state chips */}
              <div className="flex flex-wrap gap-2 items-center flex-1">
                <h1 className="text-2xl font-bold text-slate-800 mr-2 sm:mr-4">Database</h1>
                
                {locationFilter && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm animate-fade-in">
                    Location: {locationFilter}
                    <button onClick={() => setLocationFilter('')} className="ml-2 hover:text-indigo-900 focus:outline-none"><LogOut className="w-3.5 h-3.5 rotate-180"/></button>
                  </span>
                )}
                {personFilter && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-fade-in">
                    Agent: {personFilter}
                    <button onClick={() => setPersonFilter('')} className="ml-2 hover:text-emerald-900 focus:outline-none"><LogOut className="w-3.5 h-3.5 rotate-180"/></button>
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
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
                  />
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

                <button 
                  onClick={fetchRecords}
                  className="p-2.5 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm focus:outline-none flex-shrink-0"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
                </button>
                <button 
                  onClick={() => navigate('/leads')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl py-2.5 px-5 shadow-md hover:shadow-lg transition-all flex items-center flex-shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Layers className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">To Be Added (Internal Lead)</span>
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

            {/* Data Container sticky headers context */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 relative min-h-[500px]">
              {isLoading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4"></div>
                  <p className="text-slate-500 font-semibold animate-pulse">Syncing with Google Sheets...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-5 border border-slate-200">
                    <Home className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {fetchError ? 'Connection Error' : 'No properties found'}
                  </h3>
                  <p className="text-slate-500 max-w-sm mb-6">
                    {fetchError 
                      ? `The app couldn't load data: ${fetchError}. Please check your backend logs on Render.`
                      : 'No records match your current filters or the database is empty.'}
                  </p>
                  {fetchError && (
                    <button 
                      onClick={fetchRecords}
                      className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition"
                    >
                      Try Again
                    </button>
                  )}
                  <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                    {search || locationFilter || personFilter || statusFilter ? "We couldn't find any properties matching your active filters. Try adjusting your search or clearing them." : "Your database is empty. Get started by adding your very first property to the dashboard."}
                  </p>
                  {(search || locationFilter || personFilter || statusFilter) && (
                    <button 
                      onClick={() => { setSearch(''); setLocationFilter(''); setPersonFilter(''); setStatusFilter(''); }}
                      className="mt-6 text-brand-700 hover:text-white font-medium text-sm bg-brand-50 hover:bg-brand-600 py-2.5 px-6 rounded-full transition-all border border-brand-100 hover:border-transparent shadow-sm"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <RecordTable 
                  records={filteredRecords} 
                  onEdit={handleEdit} 
                  onStatusChange={handleStatusChange}
                  onPersonChange={handlePersonChange}
                  uniquePersons={uniquePersons}
                />
              )}
            </div>
            
          </div>
        </main>
      </div>

      {/* Modal */}
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

      {/* Custom Global Prompt Modal */}
      {promptConfig.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 tracking-tight">{promptConfig.title}</h3>
              <button 
                onClick={() => setPromptConfig({ isOpen: false, type: '', title: '', value: '' })}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePromptSubmit} className="p-6">
              <input 
                autoFocus
                type="text" 
                value={promptConfig.value}
                onChange={e => setPromptConfig(p => ({ ...p, value: e.target.value }))}
                placeholder={promptConfig.type === 'location' ? 'e.g. Chicago, IL' : 'e.g. John Doe'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-800 mb-6 transition-all shadow-sm"
              />
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setPromptConfig({ isOpen: false, type: '', title: '', value: '' })}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-md transition-all active:scale-95"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
