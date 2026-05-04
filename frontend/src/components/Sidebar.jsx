import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart, Layers, MapPin, Plus, Search, ChevronDown, ChevronRight, 
  Users, TrendingUp, Calendar, LayoutDashboard, Database, ClipboardList
} from 'lucide-react';

const Sidebar = ({ 
  records = [], 
  uniqueLocations = [], 
  uniquePersons = [],
  memberReportData = {},
  onAddLocation,
  onAddPerson,
  onFilterPerson,
  onFilterLocation,
  activePersonFilter,
  activeLocationFilter
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isReportsOpen, setIsReportsOpen] = useState(true);
  const [isLocationsOpen, setIsLocationsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [expandedMember, setExpandedMember] = useState(null);

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="w-72 bg-white border-r border-slate-200 h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar flex-shrink-0 hidden lg:block">
      <div className="p-4 space-y-6">
        
        {/* Navigation */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Main Menu</h3>
          <ul className="space-y-1.5">
            <li>
              <button 
                onClick={() => navigate('/dashboard')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/dashboard') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
              >
                <LayoutDashboard className={`w-5 h-5 mr-3 ${isActive('/dashboard') ? 'text-brand-500' : 'text-slate-400'}`} />
                Stats Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/properties')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/properties') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
              >
                <Database className={`w-5 h-5 mr-3 ${isActive('/properties') ? 'text-brand-500' : 'text-slate-400'}`} />
                Properties Database
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/leads')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/leads') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
              >
                <ClipboardList className={`w-5 h-5 mr-3 ${isActive('/leads') ? 'text-brand-500' : 'text-slate-400'}`} />
                Internal Leads
              </button>
            </li>
          </ul>
        </div>

        {/* Report Dashboard Section (Quick View) */}
        <div className="border border-slate-100 bg-slate-50/50 rounded-2xl overflow-hidden transition-all shadow-sm">
          <button 
            onClick={() => setIsReportsOpen(!isReportsOpen)}
            className="w-full flex justify-between items-center px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold text-slate-700">Team Quick View</span>
            </div>
            {isReportsOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {isReportsOpen && (
            <div className="p-2 space-y-1 border-t border-slate-100 bg-white max-h-[300px] overflow-y-auto custom-scrollbar">
              {Object.entries(memberReportData).length === 0 ? (
                <div className="text-center py-4 text-[10px] text-slate-400 italic">No activity yet</div>
              ) : (
                Object.entries(memberReportData).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => (
                  <button 
                    key={name}
                    onClick={() => {
                        if (onFilterPerson) onFilterPerson(name);
                        if (location.pathname !== '/properties') navigate('/properties');
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${activePersonFilter?.toLowerCase() === name.toLowerCase() ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 font-bold text-[9px]">
                        {name.charAt(0)}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md">{data.total}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Locations Directory */}
        <div className="border border-slate-100 bg-slate-50/50 rounded-2xl overflow-hidden transition-all">
          <button 
            onClick={() => setIsLocationsOpen(!isLocationsOpen)}
            className="w-full flex justify-between items-center px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Locations</span>
            </div>
            {isLocationsOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          {isLocationsOpen && (
            <div className="p-2 space-y-2 border-t border-slate-100 bg-white">
              <ul className="space-y-0.5 max-h-[200px] overflow-y-auto px-1 custom-scrollbar">
                {uniqueLocations.map(loc => (
                  <li key={loc}>
                    <button 
                      onClick={() => {
                          if (onFilterLocation) onFilterLocation(loc);
                          if (location.pathname !== '/properties') navigate('/properties');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] transition-all ${activeLocationFilter === loc ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="truncate">{loc}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
