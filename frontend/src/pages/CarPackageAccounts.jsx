import React, { useState, useEffect } from 'react';
import { 
  WalletCards, Search, Filter, RefreshCw, Plus, CheckCircle2, 
  Clock, XCircle, AlertCircle, ChevronLeft, ChevronRight, Edit, 
  ArrowUpDown, Download, DollarSign, UserCheck, ShieldAlert
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import CarPaymentStatusModal from '../components/CarPaymentStatusModal';
import api from '../api';

const STATUS_CONFIG = {
  'To be paid': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Paid': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Vendor Confirmed': { bg: 'bg-teal-900', text: 'text-white', border: 'border-teal-950', dot: 'bg-emerald-400' },
  'Cancelled': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
};

const CarPackageAccounts = () => {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPurchasePrice: 0,
    totalAdvanceToBePaid: 0,
    totalSecondaryAdvance: 0,
    totalPaid: 0,
    totalPending: 0,
    totalGuestCollection: 0,
    statusCounts: { toBePaid: 0, paid: 0, vendorConfirmed: 0, cancelled: 0 }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const [filterOptions, setFilterOptions] = useState({
    vendors: [],
    carTypes: [],
    statuses: ['To be paid', 'Paid', 'Vendor Confirmed', 'Cancelled']
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 30;

  // Selected booking for payment status modal
  const [selectedBookingForEdit, setSelectedBookingForEdit] = useState(null);

  // Sidebar controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (vendorFilter !== 'all') params.append('vendor', vendorFilter);
      if (monthFilter !== 'all') params.append('month', monthFilter);
      params.append('page', page);
      params.append('limit', limit);
      params.append('paginate', 'true');

      const res = await api.get(`/car-packages/accounts?${params.toString()}`);
      setRecords(res.data.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
      if (res.data.filters) {
        setFilterOptions(prev => ({
          ...prev,
          vendors: res.data.filters.vendors || [],
          carTypes: res.data.filters.carTypes || []
        }));
      }
      if (res.data.meta) {
        setTotalPages(res.data.meta.totalPages || 1);
        setTotalRecords(res.data.meta.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch car accounts records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [page, search, statusFilter, vendorFilter, monthFilter]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.post('/car-packages/accounts/sync');
      await fetchAccounts();
    } catch (err) {
      console.error("Failed to sync accounts from master:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickStatusChange = async (record, newStatus) => {
    try {
      // Optimistic update
      setRecords(prev => prev.map(r => 
        (r["Vendorwise ID"] === record["Vendorwise ID"]) 
          ? { ...r, "Advance Status": newStatus } 
          : r
      ));

      await api.patch(`/car-packages/accounts/${encodeURIComponent(record["Vendorwise ID"] || record._rowIndex)}/status`, {
        status: newStatus
      });

      // Refetch stats to keep numbers accurate
      fetchAccounts();
    } catch (err) {
      console.error("Failed to update status:", err);
      fetchAccounts();
    }
  };

  const formatRupee = (val) => {
    if (!val) return '₹0';
    const num = parseFloat(val.toString().replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) return '₹0';
    return `₹${num.toLocaleString('en-IN')}`;
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 text-brand-600 rounded-xl border border-brand-500/20">
              <WalletCards className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">Vendor Accounts & Payments</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Google Sheet Synced
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage vendor purchase costs, advance payments, due collections & payment statuses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              title="Sync newly created bookings from Master into Accounts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with Master'}</span>
            </button>

            <button
              onClick={() => setSelectedBookingForEdit({})}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account Row</span>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Purchase</span>
              <p className="text-lg font-black text-slate-900 mt-1">{formatRupee(stats.totalPurchasePrice)}</p>
              <span className="text-[10px] text-slate-500 font-medium">{stats.totalRecords} total bookings</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Advance To Be Paid</span>
              <p className="text-lg font-black text-amber-800 mt-1">{formatRupee(stats.totalAdvanceToBePaid)}</p>
              <span className="text-[10px] text-amber-600 font-semibold">{stats.statusCounts.toBePaid} pending bookings</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Advance Paid</span>
              <p className="text-lg font-black text-emerald-800 mt-1">{formatRupee(stats.totalPaid)}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">{stats.statusCounts.paid} settled trips</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/30 shadow-sm">
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Vendor Confirmed</span>
              <p className="text-lg font-black text-teal-900 mt-1">{stats.statusCounts.vendorConfirmed}</p>
              <span className="text-[10px] text-teal-700 font-medium">Verified by vendor</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Guest Collections</span>
              <p className="text-lg font-black text-slate-800 mt-1">{formatRupee(stats.totalGuestCollection)}</p>
              <span className="text-[10px] text-slate-400 font-medium">Collected on-site</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Cancelled</span>
              <p className="text-lg font-black text-rose-800 mt-1">{stats.statusCounts.cancelled}</p>
              <span className="text-[10px] text-rose-600 font-medium">Void bookings</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search Vendorwise ID, guest, vendor, car..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Payment Statuses</option>
                {filterOptions.statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              {/* Vendor Filter */}
              <select
                value={vendorFilter}
                onChange={(e) => { setVendorFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:ring-2 focus:ring-brand-500 max-w-[200px]"
              >
                <option value="all">All Vendors</option>
                {filterOptions.vendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Showing {records.length} of {totalRecords} records
            </div>
          </div>

          {/* Accounts Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold tracking-wider text-[11px] uppercase border-b border-slate-800">
                    <th className="px-4 py-3.5 whitespace-nowrap">Vendorwise ID</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Guest Name</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">Date</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">Car Type</th>
                    <th className="px-3 py-3.5 text-right whitespace-nowrap">Purchase Price</th>
                    <th className="px-3 py-3.5 text-right whitespace-nowrap">Advance to be Paid</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Advance Status</th>
                    <th className="px-3 py-3.5 text-right whitespace-nowrap">Sec. Advance</th>
                    <th className="px-3 py-3.5 text-right whitespace-nowrap">Guest Collection</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Vendor</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Remarks</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
                          <span className="font-semibold text-xs">Loading Accounts from Google Sheet...</span>
                        </div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-slate-400 italic">
                        No vendor account entries found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => {
                      const statusStyle = STATUS_CONFIG[r["Advance Status"]] || STATUS_CONFIG['To be paid'];

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* Vendorwise ID */}
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                              {r["Vendorwise ID"] || "N/A"}
                            </span>
                          </td>

                          {/* Guest Name */}
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            {r["Guest Name"] || "—"}
                          </td>

                          {/* Date */}
                          <td className="px-3 py-3 text-slate-600 whitespace-nowrap font-medium">
                            {r["Date"] || "—"}
                          </td>

                          {/* Car Type */}
                          <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                            {r["Car Type"] || "—"}
                          </td>

                          {/* Purchase Price */}
                          <td className="px-3 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatRupee(r["Purchase Price"])}
                          </td>

                          {/* Advance to be Paid */}
                          <td className="px-3 py-3 text-right font-black text-amber-800 whitespace-nowrap">
                            {formatRupee(r["Advance to be Paid"])}
                          </td>

                          {/* Advance Status Dropdown */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <select
                              value={r["Advance Status"] || "To be paid"}
                              onChange={(e) => handleQuickStatusChange(r, e.target.value)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-all ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                            >
                              <option value="To be paid">To be paid</option>
                              <option value="Paid">Paid</option>
                              <option value="Vendor Confirmed">Vendor Confirmed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>

                          {/* Secondary Advance */}
                          <td className="px-3 py-3 text-right text-slate-700 whitespace-nowrap font-medium">
                            {r["Secondary Advance"] ? formatRupee(r["Secondary Advance"]) : "—"}
                          </td>

                          {/* Guest Collection */}
                          <td className="px-3 py-3 text-right text-slate-700 whitespace-nowrap font-medium">
                            {r["Guest Collection"] ? formatRupee(r["Guest Collection"]) : "—"}
                          </td>

                          {/* Vendor */}
                          <td className="px-4 py-3 text-slate-800 whitespace-nowrap font-semibold">
                            {r["Vendor"] || "—"}
                          </td>

                          {/* Remarks */}
                          <td className="px-4 py-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={r["Remarks"]}>
                            {r["Remarks"] || "—"}
                          </td>

                          {/* Action button */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => setSelectedBookingForEdit(r)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-brand-600 rounded-lg transition-colors"
                              title="Edit complete payment & vendor ledger"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                <div>
                  Page <span className="font-bold">{page}</span> of <span className="font-bold">{totalPages}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Payment Edit Modal */}
      {selectedBookingForEdit && (
        <CarPaymentStatusModal
          booking={selectedBookingForEdit}
          onClose={() => setSelectedBookingForEdit(null)}
          onSuccess={() => fetchAccounts()}
        />
      )}

    </div>
  );
};

export default CarPackageAccounts;
