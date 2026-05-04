import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ChevronLeft, BarChart, Users, MapPin, Calendar, 
  TrendingUp, Home, ArrowUpRight, ArrowDownRight, 
  Search, RefreshCw, Award, Target, Activity
} from 'lucide-react';
import api from '../api';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, year
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/records?paginate=false');
      setRecords(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Failed to fetch records', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const isWithinDays = (dateStr, days) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= days;
    };

    const filtered = records.filter(r => {
      const date = r["Date of Entry"];
      if (!date) return dateFilter === 'all';
      if (dateFilter === 'today') return date === today;
      if (dateFilter === 'week') return isWithinDays(date, 7);
      if (dateFilter === 'month') return isWithinDays(date, 30);
      if (dateFilter === 'year') return date.startsWith(now.getFullYear().toString());
      return true;
    });

    const report = {};
    filtered.forEach(r => {
      const member = r["Name of Person"] || "Unassigned";
      const loc = r["Location"] || "Unknown Location";

      if (!report[member]) {
        report[member] = { total: 0, locations: {}, lastActive: null };
      }

      report[member].total++;
      report[member].locations[loc] = (report[member].locations[loc] || 0) + 1;
      
      if (!report[member].lastActive || r["Date of Entry"] > report[member].lastActive) {
        report[member].lastActive = r["Date of Entry"];
      }
    });

    const totalRecords = filtered.length;
    const activeAgents = Object.keys(report).length;
    
    // Find top agent
    let topAgent = { name: 'None', count: 0 };
    Object.entries(report).forEach(([name, data]) => {
      if (data.total > topAgent.count) {
        topAgent = { name, count: data.total };
      }
    });

    // Find most active location
    const locationStats = {};
    filtered.forEach(r => {
      const loc = r["Location"] || "Unknown";
      locationStats[loc] = (locationStats[loc] || 0) + 1;
    });
    let topLocation = { name: 'None', count: 0 };
    Object.entries(locationStats).forEach(([name, count]) => {
      if (count > topLocation.count) {
        topLocation = { name, count };
      }
    });

    return {
      report,
      totalRecords,
      activeAgents,
      topAgent,
      topLocation,
      filteredCount: filtered.length
    };
  }, [records, dateFilter]);

  const filteredReportEntries = useMemo(() => {
    return Object.entries(stats.report)
      .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b[1].total - a[1].total);
  }, [stats.report, searchTerm]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <BarChart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Report Dashboard</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={fetchRecords}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
              </button>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-700">{user?.email}</span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                  Live Analytics
                </span>
              </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
        
        {/* Filter Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit">
            {['all', 'today', 'week', 'month', 'year'].map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-tight transition-all ${dateFilter === f ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Properties" 
            value={stats.totalRecords} 
            icon={<Home className="w-6 h-6" />} 
            color="blue"
            trend="+12%"
            trendUp={true}
          />
          <StatCard 
            title="Active Agents" 
            value={stats.activeAgents} 
            icon={<Users className="w-6 h-6" />} 
            color="indigo"
          />
          <StatCard 
            title="Top Performer" 
            value={stats.topAgent.name} 
            subtitle={`${stats.topAgent.count} entries`}
            icon={<Award className="w-6 h-6" />} 
            color="amber"
          />
          <StatCard 
            title="Hot Location" 
            value={stats.topLocation.name} 
            subtitle={`${stats.topLocation.count} properties`}
            icon={<MapPin className="w-6 h-6" />} 
            color="emerald"
          />
        </div>

        {/* Detailed Report */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Agent Performance</h3>
                <p className="text-xs text-slate-500">Breakdown of listings per team member</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-4">Agent Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Top Locations</th>
                  <th className="px-6 py-4">Total Listings</th>
                  <th className="px-6 py-4 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan="5" className="py-20 text-center"><div className="animate-spin h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full mx-auto"></div></td></tr>
                ) : filteredReportEntries.length === 0 ? (
                  <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-medium">No records found for this period</td></tr>
                ) : (
                  filteredReportEntries.map(([name, data]) => (
                    <tr key={name} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200 shadow-sm">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{name}</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Joined in 2024</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {Object.entries(data.locations)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 2)
                            .map(([loc, count]) => (
                              <span key={loc} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                {loc} ({count})
                              </span>
                            ))}
                          {Object.keys(data.locations).length > 2 && (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center">+{Object.keys(data.locations).length - 2} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                           <span className="font-black text-slate-800 text-lg">{data.total}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase">units</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand-500 rounded-full transition-all duration-1000" 
                              style={{ width: `${Math.min(100, (data.total / (stats.topAgent.count || 1)) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{Math.round((data.total / (stats.totalRecords || 1)) * 100)}% Contribution</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secondary Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-600" />
                Performance Distribution
              </h3>
              <div className="space-y-6">
                {filteredReportEntries.slice(0, 5).map(([name, data]) => (
                  <div key={name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-700">{name}</span>
                      <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">{data.total} Properties</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full" 
                        style={{ width: `${(data.total / (stats.topAgent.count || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-brand-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="relative z-10">
                <TrendingUp className="w-12 h-12 text-brand-400 mb-6" />
                <h2 className="text-3xl font-bold mb-4 leading-tight">Database Growth <br/> Insights</h2>
                <p className="text-brand-200 text-sm max-w-xs mb-8">Your team is growing the property database by an average of 4.2% per week. High demand in {stats.topLocation.name}.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-brand-300 text-[10px] font-bold uppercase mb-1">Weekly Target</div>
                  <div className="text-2xl font-bold">84%</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <div className="text-brand-300 text-[10px] font-bold uppercase mb-1">Avg Efficiency</div>
                  <div className="text-2xl font-bold">9.2</div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
           </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .bg-brand-600 { background-color: #4f46e5; }
        .text-brand-600 { color: #4f46e5; }
        .bg-brand-50 { background-color: #eef2ff; }
        .bg-brand-500 { background-color: #6366f1; }
        .text-brand-500 { color: #6366f1; }
        .border-brand-100 { border-color: #e0e7ff; }
        .bg-brand-100 { background-color: #e0e7ff; }
        .bg-brand-900 { background-color: #312e81; }
        .text-brand-200 { color: #c7d2fe; }
        .text-brand-300 { color: #a5b4fc; }
        .text-brand-400 { color: #818cf8; }
        .from-brand-500 { --tw-gradient-from: #6366f1; --tw-gradient-to: rgb(99 102 241 / 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
        .to-indigo-500 { --tw-gradient-to: #6366f1; }
      `}} />
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle, trend, trendUp }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]} border transition-transform group-hover:scale-110 duration-300`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-lg ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 truncate max-w-full">{value}</span>
        </div>
        {subtitle && <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{subtitle}</p>}
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
    </div>
  );
};

export default Reports;
