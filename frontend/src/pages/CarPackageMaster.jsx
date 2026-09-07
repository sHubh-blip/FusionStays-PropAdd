import React, { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import CarWhatsAppMessageModal from '../components/CarWhatsAppMessageModal';
import CarQuotationPDFModal from '../components/CarQuotationPDFModal';
import CarBookingModal from '../components/CarBookingModal';
import CarMasterEditModal from '../components/CarMasterEditModal';
import CarBookingDaywisePreviewModal from '../components/CarBookingDaywisePreviewModal';
import { 
  Car, Search, RefreshCw, MessageSquare, FileText, Calendar, 
  TrendingUp, DollarSign, CheckCircle2, ChevronRight, User, Phone, 
  MapPin, ShieldCheck, ArrowUpDown, Filter, Plus, Edit, Eye, Clock, AlertCircle
} from 'lucide-react';

const CarPackageMaster = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalSales: 0,
    totalPurchaseCost: 0,
    totalProfit: 0,
    totalAdvance: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState(null);
  const [selectedBookingForPreview, setSelectedBookingForPreview] = useState(null);
  const [selectedBookingForMsg, setSelectedBookingForMsg] = useState(null);
  const [selectedBookingForPDF, setSelectedBookingForPDF] = useState(null);
  const [daywiseData, setDaywiseData] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);


  const fetchMasterRecords = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (monthFilter !== 'all') params.append('month', monthFilter);
      if (cityFilter !== 'all') params.append('city', cityFilter);
      params.append('paginate', 'false');

      const res = await api.get(`/car-packages/master?${params.toString()}`);
      setRecords(res.data.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch car master records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterRecords();
  }, [search, monthFilter, cityFilter]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await api.post('/car-packages/sync');
      await fetchMasterRecords();
    } catch (err) {
      console.error("Failed to sync car packages:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenWhatsAppModal = async (booking) => {
    setSelectedBookingForMsg(booking);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/car-packages/booking/${encodeURIComponent(booking["Booking ID"] || booking["Vendorwise ID"])}`);
      setDaywiseData(res.data.daywise || []);
    } catch (err) {
      console.error("Failed to fetch booking daywise details:", err);
      setDaywiseData([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenPDFModal = async (booking) => {
    setSelectedBookingForPDF(booking);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/car-packages/booking/${encodeURIComponent(booking["Booking ID"] || booking["Vendorwise ID"])}`);
      setDaywiseData(res.data.daywise || []);
    } catch (err) {
      console.error("Failed to fetch booking daywise details:", err);
      setDaywiseData([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenPreviewModal = async (booking) => {
    setSelectedBookingForPreview(booking);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/car-packages/booking/${encodeURIComponent(booking["Booking ID"] || booking["Vendorwise ID"])}`);
      setDaywiseData(res.data.daywise || []);
    } catch (err) {
      console.error("Failed to fetch booking daywise details:", err);
      setDaywiseData([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenEditModal = (booking) => {
    setSelectedBookingForEdit(booking);
  };

  const handleQuickStatusChange = async (booking, newStatus) => {
    const bookingId = booking._rowIndex || booking["Booking ID"] || booking["Vendorwise ID"];
    
    // Optimistic UI update
    setRecords(prev => prev.map(r => {
      const match = (r._rowIndex && r._rowIndex === booking._rowIndex) ||
                    (r["Booking ID"] && r["Booking ID"] === booking["Booking ID"]);
      return match ? { ...r, Status: newStatus } : r;
    }));

    try {
      await api.patch(`/car-packages/master/${encodeURIComponent(bookingId)}/status`, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
      fetchMasterRecords();
    }
  };

  // Extract unique cities & team member names
  const uniqueCities = [...new Set(records.map(r => r["Start City"]).filter(Boolean))];
  const uniqueNames = [...new Set(records.map(r => r["Name"]).filter(Boolean))];

  // Status stats & options
  const STATUS_LIST = [
    'Car Package Enquiry',
    'In Progress',
    'Rates Shared',
    'Confirmed',
    'Not Confirmed'
  ];

  const statusCounts = STATUS_LIST.reduce((acc, st) => {
    acc[st] = records.filter(r => (r["Status"] || 'Confirmed').toLowerCase() === st.toLowerCase()).length;
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans relative">
      <Sidebar 
        isOpen={isSidebarOpen}
        isHovered={isSidebarHovered}
        onClose={() => { setIsSidebarOpen(false); setIsSidebarHovered(false); }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      />

      {/* Edge hover trigger for opening sidebar smoothly */}
      {!isSidebarOpen && !isSidebarHovered && (
        <div
          className="fixed left-0 top-0 bottom-0 w-4 z-30 cursor-e-resize"
          onMouseEnter={() => setIsSidebarHovered(true)}
          title="Hover or scroll to open menu"
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
        
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm active:scale-95"
              title="Toggle Navigation Menu"
            >
              <Filter className="w-5 h-5 text-brand-600 hidden" />
              <div className="flex flex-col gap-1 w-5">
                <span className="h-0.5 w-full bg-slate-700 rounded-full"></span>
                <span className="h-0.5 w-4 bg-slate-700 rounded-full"></span>
                <span className="h-0.5 w-full bg-slate-700 rounded-full"></span>
              </div>
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                <Car className="w-4 h-4" />
                Car Package Module
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Car Package Master
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage booking master records, sales margins, quotations, and client dispatches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Car Booking
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
                isSyncing 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-600' : 'text-slate-500'}`} />
              {isSyncing ? 'Syncing...' : 'Sync Sheet'}
            </button>
          </div>
        </header>


        <div className="p-6 space-y-6">
          
          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Total Bookings */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Bookings</span>
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <Car className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900">{stats.totalBookings}</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Active packages</div>
              </div>
            </div>

            {/* Gross Sales */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900">₹{stats.totalSales.toLocaleString()}</div>
                <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">Gross revenue</div>
              </div>
            </div>

            {/* Purchase Cost */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Purchase Cost</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900">₹{stats.totalPurchaseCost.toLocaleString()}</div>
                <div className="text-[11px] font-semibold text-rose-500 mt-0.5">Vendor payouts</div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-700">₹{stats.totalProfit.toLocaleString()}</div>
                <div className="text-[11px] font-semibold text-amber-600 mt-0.5">Retained margin</div>
              </div>
            </div>

            {/* Advance Received */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Advance Recd</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900">₹{stats.totalAdvance.toLocaleString()}</div>
                <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">Collected upfront</div>
              </div>
            </div>

          </div>

          {/* Status Metric Cards Filter */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {STATUS_LIST.map((st) => {
              const count = statusCounts[st] || 0;
              const isSelected = statusFilter.toLowerCase() === st.toLowerCase();
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(isSelected ? 'all' : st)}
                  className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-brand-500'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>
                      {st}
                    </span>
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </div>
                  <div className={`text-[10px] font-semibold ${isSelected ? 'text-brand-300' : 'text-slate-400'}`}>
                    {isSelected ? 'Filtering active' : 'Click to filter'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Team Member, Guest, Contact, Booking ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              
              {/* Status filter dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  {STATUS_LIST.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Handled By (Name) filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Handled By:</span>
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Team Members</option>
                  {uniqueNames.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Month filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Month:</span>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Months</option>
                  <option value="Aug">August</option>
                  <option value="Sep">September</option>
                  <option value="Oct">October</option>
                  <option value="Nov">November</option>
                  <option value="Dec">December</option>
                </select>
              </div>

              {/* City filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>City:</span>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  {uniqueCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {(search || monthFilter !== 'all' || cityFilter !== 'all' || nameFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setMonthFilter('all');
                    setCityFilter('all');
                    setNameFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                >
                  Reset
                </button>
              )}

            </div>

          </div>

          {/* Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Handled By</th>
                    <th className="py-3.5 px-4">Booking Info</th>
                    <th className="py-3.5 px-4">Guest Details</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Dates & City</th>
                    <th className="py-3.5 px-4">Pax</th>
                    <th className="py-3.5 px-4 text-right">Sales (₹)</th>
                    <th className="py-3.5 px-4 text-right">Cost (₹)</th>
                    <th className="py-3.5 px-4 text-right">Profit (₹)</th>
                    <th className="py-3.5 px-4">Advance / Due</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-16 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-semibold text-xs text-slate-500">Loading Car Bookings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-16 text-slate-400">
                        <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <span className="font-bold text-sm text-slate-700 block">No car bookings found</span>
                        <span className="text-xs text-slate-400">Try adjusting your filters or search criteria.</span>
                      </td>
                    </tr>
                  ) : (
                    records
                      .filter(r => nameFilter === 'all' || (r["Name"] || "").toLowerCase() === nameFilter.toLowerCase())
                      .filter(r => statusFilter === 'all' || (r["Status"] || 'Confirmed').toLowerCase() === statusFilter.toLowerCase())
                      .map((r, idx) => {
                        const statusVal = r["Status"] || 'Confirmed';
                        let statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        if (statusVal.toLowerCase().includes('enquiry')) {
                          statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                        } else if (statusVal.toLowerCase().includes('progress')) {
                          statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                        } else if (statusVal.toLowerCase().includes('rates')) {
                          statusBadgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                        } else if (statusVal.toLowerCase().includes('not confirmed') || statusVal.toLowerCase().includes('cancelled')) {
                          statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                        }

                        return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                          
                          {/* Handled By (Name column from sheet) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {r["Name"] ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                {r["Name"]}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium italic">Unassigned</span>
                            )}
                          </td>
                          
                          {/* Booking Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-900">
                              {r["Booking ID"] || r["Vendorwise ID"]}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Booked: {r["Booking Date"] || "N/A"}
                            </div>
                          </td>

                          {/* Guest Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {r["Guest Name"]}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {r["Contact No"]}
                            </div>
                          </td>

                          {/* Status Field */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="relative inline-flex items-center">
                              <select
                                value={statusVal}
                                onChange={(e) => handleQuickStatusChange(r, e.target.value)}
                                className={`appearance-none cursor-pointer pl-2.5 pr-6 py-1 rounded-full text-[10px] font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 shadow-xs ${statusBadgeClass}`}
                                title="Click to change status"
                              >
                                {STATUS_LIST.map(st => (
                                  <option key={st} value={st} className="bg-white text-slate-800 font-semibold py-1">
                                    {st}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute right-2 flex items-center text-current opacity-70">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </td>

                          {/* Dates & City */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                              <span>{r["Start Date"]} ➔ {r["End Date"]}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {r["Start City"]}
                            </div>
                          </td>

                          {/* Pax */}
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs">
                              {r["Pax"]}
                            </span>
                          </td>

                          {/* Total Sales */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-bold text-slate-900">
                              ₹{r["Total Sales"]}
                            </div>
                            {r["Billing Amt"] && (
                              <div className="text-[10px] text-slate-400">
                                Base: ₹{r["Billing Amt"]}
                              </div>
                            )}
                          </td>

                          {/* Purchase Cost */}
                          <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                            ₹{r["Purchase Cost"]}
                          </td>

                          {/* Profit */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                              ₹{r["Profit"]}
                            </span>
                          </td>

                          {/* Advance / Due */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-emerald-700">
                              Adv: ₹{r["Advance Recieved"]}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                              {r["Due Collection"]}
                            </div>
                          </td>

                          {/* Quick Generator & Edit Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* Daywise Itinerary Preview Button */}
                              <button
                                onClick={() => handleOpenPreviewModal(r)}
                                title="Preview Daywise Itinerary & Routes"
                                className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl transition-all shadow-xs active:scale-95"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Master Booking Button */}
                              <button
                                onClick={() => handleOpenEditModal(r)}
                                title="Edit Master Entry & Status"
                                className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all shadow-xs active:scale-95"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* WhatsApp Button */}
                              <button
                                onClick={() => handleOpenWhatsAppModal(r)}
                                title="Generate WhatsApp Confirmation Message"
                                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all shadow-xs active:scale-95"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>

                              {/* Quotation PDF Button */}
                              <button
                                onClick={() => handleOpenPDFModal(r)}
                                title="Generate Official PDF Quotation"
                                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-all shadow-xs active:scale-95"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>

      {/* Add New Car Booking Modal */}
      {isAddModalOpen && (
        <CarBookingModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchMasterRecords();
          }}
        />
      )}

      {/* Edit Master Booking Modal */}
      {selectedBookingForEdit && (
        <CarMasterEditModal
          booking={selectedBookingForEdit}
          onClose={() => setSelectedBookingForEdit(null)}
          onSuccess={() => {
            fetchMasterRecords();
          }}
        />
      )}

      {/* Daywise Preview Modal */}
      {selectedBookingForPreview && (
        <CarBookingDaywisePreviewModal
          booking={selectedBookingForPreview}
          daywise={daywiseData}
          onClose={() => setSelectedBookingForPreview(null)}
        />
      )}

      {/* WhatsApp Message Modal */}
      {selectedBookingForMsg && (
        <CarWhatsAppMessageModal
          booking={selectedBookingForMsg}
          daywise={daywiseData}
          onClose={() => setSelectedBookingForMsg(null)}
        />
      )}

      {/* PDF Quotation Modal */}
      {selectedBookingForPDF && (
        <CarQuotationPDFModal
          booking={selectedBookingForPDF}
          daywise={daywiseData}
          onClose={() => setSelectedBookingForPDF(null)}
        />
      )}

    </div>
  );
};

export default CarPackageMaster;
