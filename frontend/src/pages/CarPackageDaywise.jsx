import React, { useState, useEffect } from 'react';
import api from '../api';
import Sidebar from '../components/Sidebar';
import CarWhatsAppMessageModal from '../components/CarWhatsAppMessageModal';
import CarQuotationPDFModal from '../components/CarQuotationPDFModal';
import CarBookingModal from '../components/CarBookingModal';
import CarDaywiseEditModal from '../components/CarDaywiseEditModal';
import CarPaymentStatusModal from '../components/CarPaymentStatusModal';
import { 
  Calendar, Search, RefreshCw, MessageSquare, FileText, 
  MapPin, Car, User, Phone, Navigation, ArrowRight, Filter, 
  Building2, CheckCircle2, ChevronRight, Plus, Edit, CreditCard
} from 'lucide-react';

const CarPackageDaywise = () => {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ vendors: [], carTypes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [carTypeFilter, setCarTypeFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRowForEdit, setSelectedRowForEdit] = useState(null);
  const [selectedBookingForMsg, setSelectedBookingForMsg] = useState(null);
  const [selectedBookingForPDF, setSelectedBookingForPDF] = useState(null);
  const [daywiseData, setDaywiseData] = useState([]);


  const fetchDaywiseRecords = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (vendorFilter !== 'all') params.append('vendor', vendorFilter);
      if (carTypeFilter !== 'all') params.append('carType', carTypeFilter);
      if (nameFilter !== 'all') params.append('name', nameFilter);
      if (dateFilter) params.append('date', dateFilter);
      params.append('paginate', 'false');

      const res = await api.get(`/car-packages/daywise?${params.toString()}`);
      setRecords(res.data.data || []);
      if (res.data.filters) {
        setFilters(res.data.filters);
      }
    } catch (err) {
      console.error("Failed to fetch daywise records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDaywiseRecords();
  }, [search, vendorFilter, carTypeFilter, nameFilter, dateFilter]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await api.post('/car-packages/sync');
      await fetchDaywiseRecords();
    } catch (err) {
      console.error("Failed to sync car packages:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenWhatsAppModal = async (dayRow) => {
    try {
      const res = await api.get(`/car-packages/booking/${encodeURIComponent(dayRow["Booking ID"] || dayRow["Vendorwise ID"])}`);
      setSelectedBookingForMsg(res.data.master || dayRow);
      setDaywiseData(res.data.daywise || [dayRow]);
    } catch (err) {
      setSelectedBookingForMsg(dayRow);
      setDaywiseData([dayRow]);
    }
  };

  const handleOpenPDFModal = async (dayRow) => {
    try {
      const res = await api.get(`/car-packages/booking/${encodeURIComponent(dayRow["Booking ID"] || dayRow["Vendorwise ID"])}`);
      setSelectedBookingForPDF(res.data.master || dayRow);
      setDaywiseData(res.data.daywise || [dayRow]);
    } catch (err) {
      setSelectedBookingForPDF(dayRow);
      setDaywiseData([dayRow]);
    }
  };

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
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm active:scale-95"
              title="Toggle Navigation Menu"
            >
              <div className="flex flex-col gap-1 w-5">
                <span className="h-0.5 w-full bg-slate-700 rounded-full"></span>
                <span className="h-0.5 w-4 bg-slate-700 rounded-full"></span>
                <span className="h-0.5 w-full bg-slate-700 rounded-full"></span>
              </div>
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                <Calendar className="w-4 h-4" />
                Operations & Itinerary Tracker
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Daywise Car Details
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Track daily vehicle dispatches, vendor assignments, sightseeing routes, and pickup schedules.
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
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Guest, Vendor, Route, Itinerary..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              
              {/* Vendor Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Vendor:</span>
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Vendors</option>
                  {filters.vendors.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Car Type Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span>Car Type:</span>
                <select
                  value={carTypeFilter}
                  onChange={(e) => setCarTypeFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Vehicle Types</option>
                  {filters.carTypes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Name / User Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Handled By:</span>
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Team Members</option>
                  {(filters.names || []).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Date Input Filter with Calendar */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                />
              </div>

              {(search || vendorFilter !== 'all' || carTypeFilter !== 'all' || nameFilter !== 'all' || dateFilter) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setVendorFilter('all');
                    setCarTypeFilter('all');
                    setNameFilter('all');
                    setDateFilter('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                >
                  Reset
                </button>
              )}

            </div>

          </div>

          {/* Daywise Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3 w-28 whitespace-nowrap">Handled By</th>
                    <th className="py-3 px-3 w-32 whitespace-nowrap">Date</th>
                    <th className="py-3 px-3 w-44 whitespace-nowrap">Booking & Guest</th>
                    <th className="py-3 px-3 w-36 whitespace-nowrap">Route</th>
                    <th className="py-3 px-3 w-28 whitespace-nowrap">Vehicle</th>
                    <th className="py-3 px-3 w-28 whitespace-nowrap">Vendor</th>
                    <th className="py-3 px-3 min-w-[200px]">Day Itinerary & Sightseeing</th>
                    <th className="py-3 px-3 w-28 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-semibold text-xs text-slate-500">Loading Daywise Records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">
                        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <span className="font-bold text-sm text-slate-700 block">No daywise records found</span>
                        <span className="text-xs text-slate-400">Try adjusting your filters or search criteria.</span>
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                        
                        {/* Handled By (Name column from sheet) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {r["Name"] ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              <span className="truncate max-w-[80px]" title={r["Name"]}>{r["Name"]}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic">Unassigned</span>
                          )}
                        </td>
                        
                        {/* Date */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                            <span>{r["Start Date"]}</span>
                          </div>
                        </td>

                        {/* Booking & Guest */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1 truncate" title={r["Guest Name"]}>
                            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{r["Guest Name"]}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span className="text-slate-400">{r["Booking ID"] || r["Vendorwise ID"]}</span>
                            {r["Contact No"] && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                {r["Contact No"]}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Route (From -> To) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md text-[11px] w-fit">
                            <span className="truncate max-w-[65px]" title={r["From"] || "Start"}>{r["From"] || "Start"}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[65px]" title={r["To"] || "End"}>{r["To"] || "End"}</span>
                          </div>
                        </td>

                        {/* Vehicle & Quantity */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                            <Car className="w-3 h-3 text-brand-600 flex-shrink-0" />
                            <span className="truncate max-w-[80px]" title={r["Car Type"]}>{r["Car Type"] || "Car"}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            Qty: <span className="text-brand-600 font-bold">{r["No of Cars"] || 1}</span>
                          </div>
                        </td>

                        {/* Assigned Vendor */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 flex items-center gap-1 bg-brand-50/70 text-brand-900 px-2 py-0.5 rounded-md text-[10px] w-fit" title={r["Vendor"]}>
                            <Building2 className="w-3 h-3 text-brand-600 flex-shrink-0" />
                            <span className="truncate max-w-[85px]">{r["Vendor"] || "Direct"}</span>
                          </div>
                        </td>

                        {/* Itinerary */}
                        <td className="py-2.5 px-3 text-slate-700">
                          <p className="text-[11px] leading-snug line-clamp-2 max-w-xl" title={r["Itinerary"]}>
                            {r["Itinerary"] || "No specific itinerary provided."}
                          </p>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Vendor Payment Status Button */}
                            <button
                              onClick={() => setSelectedBookingForPayment(r)}
                              title="See / Add / Edit Vendor Payment Status & Ledger"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all shadow-2xs active:scale-95 border border-emerald-200"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setSelectedRowForEdit(r)}
                              title="Edit Daywise Route & Vehicle Details"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all shadow-2xs active:scale-95"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenWhatsAppModal(r)}
                              title="Generate WhatsApp Message"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all shadow-2xs active:scale-95"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenPDFModal(r)}
                              title="Generate PDF Quotation"
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-all shadow-2xs active:scale-95"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>

      {/* Edit Daywise Modal */}
      {selectedRowForEdit && (
        <CarDaywiseEditModal
          dayRow={selectedRowForEdit}
          onClose={() => setSelectedRowForEdit(null)}
          onSuccess={() => {
            fetchDaywiseRecords();
          }}
        />
      )}

      {/* Add New Car Booking Modal */}
      {isAddModalOpen && (
        <CarBookingModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchDaywiseRecords();
          }}
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

      {/* Vendor Payment & Accounts Modal */}
      {selectedBookingForPayment && (
        <CarPaymentStatusModal
          booking={selectedBookingForPayment}
          onClose={() => setSelectedBookingForPayment(null)}
          onSuccess={() => fetchDaywiseRecords()}
        />
      )}

    </div>
  );
};

export default CarPackageDaywise;
