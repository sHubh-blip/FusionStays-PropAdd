import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  BarChart, Layers, MapPin, Plus, Search, ChevronDown, ChevronRight, 
  Users, TrendingUp, Calendar, LayoutDashboard, Database, ClipboardList, Settings,
  FileText, LogOut, Shield, X
} from 'lucide-react';
import EODGeneratorModal from './EODGeneratorModal';

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
  activeLocationFilter,
  isOpen = false,
  isHovered = false,
  onClose,
  onMouseEnter,
  onMouseLeave
}) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isReportsOpen, setIsReportsOpen] = useState(true);
  const [isLocationsOpen, setIsLocationsOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isEODModalOpen, setIsEODModalOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [expandedMember, setExpandedMember] = useState(null);

  const isActive = (path) => location.pathname === path;
  const userRole = user?.role?.toLowerCase() || '';
  const isOps = userRole === 'ops';
  const isPropAdd = ['prop_add', 'prop/add'].includes(userRole);

  const isVisible = isOpen || isHovered;

  return (
    <>
      {/* Backdrop for mobile and open sidebar */}
      {isVisible && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside 
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 h-screen overflow-y-auto custom-scrollbar flex-shrink-0 transform transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6 flex flex-col justify-between min-h-full">
          
          <div className="space-y-6">
            {/* Header with App Logo & Close Button */}
            <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img src="/fusionstays-logo.png" alt="FusionStays" className="h-7 w-auto object-contain" />
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Menu Navigation (Hidden for Ops) */}
            {!isOps && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Main Menu</h3>
                <ul className="space-y-1.5">
                  {user?.role !== 'team_member' && (
                    <li>
                      <button 
                        onClick={() => { navigate('/dashboard'); if (onClose) onClose(); }}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/dashboard') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                      >
                        <LayoutDashboard className={`w-5 h-5 mr-3 ${isActive('/dashboard') ? 'text-brand-500' : 'text-slate-400'}`} />
                        Stats Dashboard
                      </button>
                    </li>
                  )}
                  {user?.role !== 'team_member' && (
                    <li>
                      <button 
                        onClick={() => { navigate('/properties'); if (onClose) onClose(); }}
                        className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/properties') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                      >
                        <Database className={`w-5 h-5 mr-3 ${isActive('/properties') ? 'text-brand-500' : 'text-slate-400'}`} />
                        Properties Database
                      </button>
                    </li>
                  )}
                  <li>
                    <button 
                      onClick={() => { navigate('/leads'); if (onClose) onClose(); }}
                      className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/leads') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                    >
                      <ClipboardList className={`w-5 h-5 mr-3 ${isActive('/leads') ? 'text-brand-500' : 'text-slate-400'}`} />
                      Internal Leads
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setIsEODModalOpen(true)}
                      className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 font-medium"
                    >
                      <FileText className="w-5 h-5 mr-3 text-emerald-600" />
                      EOD Generator
                    </button>
                  </li>
                  {user?.role === 'admin' && (
                    <>
                      <li>
                        <button 
                          onClick={() => { navigate('/dropdown-manager'); if (onClose) onClose(); }}
                          className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/dropdown-manager') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                        >
                          <Settings className={`w-5 h-5 mr-3 ${isActive('/dropdown-manager') ? 'text-brand-500' : 'text-slate-400'}`} />
                          Dropdown Settings
                        </button>
                      </li>
                      <li>
                        <button 
                          onClick={() => { navigate('/user-management'); if (onClose) onClose(); }}
                          className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/user-management') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                        >
                          <Users className={`w-5 h-5 mr-3 ${isActive('/user-management') ? 'text-brand-500' : 'text-slate-400'}`} />
                          User Registry
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}

            {/* Car Packages Section (Visible for Ops & Admin; Hidden for Prop/Add) */}
            {!isPropAdd && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Car Packages</h3>
                <ul className="space-y-1.5">
                  <li>
                    <button 
                      onClick={() => { navigate('/car-packages/master'); if (onClose) onClose(); }}
                      className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/car-packages/master') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                    >
                      <Layers className={`w-5 h-5 mr-3 ${isActive('/car-packages/master') ? 'text-brand-500' : 'text-slate-400'}`} />
                      Car Package Master
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => { navigate('/car-packages/daywise'); if (onClose) onClose(); }}
                      className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${isActive('/car-packages/daywise') ? 'bg-brand-50 text-brand-700 font-bold shadow-sm border border-brand-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}`}
                    >
                      <Calendar className={`w-5 h-5 mr-3 ${isActive('/car-packages/daywise') ? 'text-brand-500' : 'text-slate-400'}`} />
                      Daywise Operations
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* Report Dashboard Section (Quick View) - Hidden for Ops */}
            {!isOps && (
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
                              if (onClose) onClose();
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
            )}
          </div>

          {/* User Profile & Logout Box (especially helpful for Ops users) */}
          {user && (
            <div className="pt-4 border-t border-slate-200">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-800 truncate">{user?.name || user?.email}</div>
                    <div className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">{user?.role}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </aside>

      {isEODModalOpen && (
        <EODGeneratorModal onClose={() => setIsEODModalOpen(false)} />
      )}
    </>
  );
};

export default Sidebar;
