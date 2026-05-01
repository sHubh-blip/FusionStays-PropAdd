import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, ArrowLeft, RefreshCw, BarChart, Calendar, Users, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api';

const Reports = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
  const [reportDateFilter, setReportDateFilter] = useState('all'); // all, today, week, month, year
  const [expandedMember, setExpandedMember] = useState(null);

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

  const memberReportData = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const isWithinDays = (dateStr, days) => {
      const d = new Date(dateStr);
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= days;
    };

    const filtered = records.filter(r => {
      const date = r["Date of Entry"];
      if (!date) return reportDateFilter === 'all';
      
      if (reportDateFilter === 'today') return date === today;
      if (reportDateFilter === 'week') return isWithinDays(date, 7);
      if (reportDateFilter === 'month') return isWithinDays(date, 30);
      if (reportDateFilter === 'year') return date.startsWith(now.getFullYear().toString());
      return true;
    });

    const report = {};
    filtered.forEach(r => {
      const member = r["Name of Person"] || "Unassigned";
      const loc = r["Location"] || "Unknown Location";
      
      if (!report[member]) {
        report[member] = { total: 0, locations: {} };
      }
      
      report[member].total++;
      report[member].locations[loc] = (report[member].locations[loc] || 0) + 1;
    });

    return report;
  }, [records, reportDateFilter]);

  const reportEntries = Object.entries(memberReportData).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-50 sticky top-0 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="font-semibold text-sm hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center border border-brand-100">
                  <BarChart className="w-4 h-4 text-brand-600" />
                </div>
                <h1 className="font-bold text-xl text-slate-800 tracking-tight">Team Reports</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <button 
                onClick={fetchRecords}
                className="p-2 text-slate-500 hover:text-brand-600 transition-colors hidden sm:block"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className="hidden sm:flex flex-col items-end border-l border-slate-200 pl-6">
                <span className="text-sm font-semibold text-slate-700">{user?.email}</span>
              </div>
              <button 
                onClick={logout}
                className="text-slate-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:py-8">
        
        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-500" />
                Time Period Filter
              </h2>
              <p className="text-sm text-slate-500 mt-1">Select a period to see how many properties each member added.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'year', label: 'This Year' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setReportDateFilter(id)}
                  className={`flex-1 sm:flex-none text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                    reportDateFilter === id 
                      ? 'bg-white text-brand-600 shadow-sm border border-slate-200' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Cards Container */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
            <p className="text-slate-500 font-semibold">Analyzing data...</p>
          </div>
        ) : fetchError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-red-700 mb-2">Failed to load data</h3>
            <p className="text-red-600 mb-6">{fetchError}</p>
            <button 
              onClick={fetchRecords}
              className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        ) : reportEntries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No activity found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              There are no properties added during the selected time period. Try changing the filter to "All Time".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportEntries.map(([name, data]) => (
              <div 
                key={name} 
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${expandedMember === name ? 'border-brand-300 ring-1 ring-brand-100' : 'border-slate-200'}`}
              >
                <div 
                  onClick={() => setExpandedMember(expandedMember === name ? null : name)}
                  className="px-6 py-5 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 font-bold text-xl border border-brand-100 shadow-inner">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{name}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Added across {Object.keys(data.locations).length} locations
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900">{data.total}</div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Properties</div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${expandedMember === name ? 'bg-brand-100 text-brand-600' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}>
                      {expandedMember === name ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedMember === name && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-fade-in">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      Location Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(data.locations).sort((a, b) => b[1] - a[1]).map(([loc, count]) => (
                        <div key={loc} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-brand-200 transition-colors">
                          <span className="font-semibold text-slate-700 truncate mr-3" title={loc}>{loc}</span>
                          <span className="bg-brand-50 text-brand-700 font-bold px-3 py-1 rounded-lg text-sm">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;
