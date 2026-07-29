// frontend/src/pages/TeamMemberDashboard.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Plus, LayoutDashboard, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import LeadUploadModal from '../components/LeadUploadModal';
import api from '../api';

export default function TeamMemberDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [submittedLeadsCount, setSubmittedLeadsCount] = useState(0);

  // Fetch options for LeadUploadModal
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [uniquePersons, setUniquePersons] = useState([]);

  const userFirstName = user?.name || (user?.email ? user.email.split('@')[0] : 'Team Member');
  const cleanName = userFirstName.charAt(0).toUpperCase() + userFirstName.slice(1);

  const fetchDropdownOptions = async () => {
    try {
      const [recordsRes, dropdownsRes, usersRes] = await Promise.all([
        api.get('/records?paginate=false').catch(() => ({ data: { data: [] } })),
        api.get('/dropdowns').catch(() => ({ data: { dropdowns: {} } })),
        api.get('/users/list').catch(() => ({ data: [] }))
      ]);

      const records = recordsRes.data?.data || [];
      const dropdowns = dropdownsRes.data?.dropdowns || {};
      const users = usersRes.data || [];

      const recordPersons = records.map(r => r["Name of Person"]).filter(Boolean);
      const dropdownPersons = dropdowns.agent?.values || [];
      const userPersons = users.map(u => {
        if (u.name && u.name.trim()) return u.name.trim();
        const userPart = u.email ? u.email.split('@')[0] : '';
        return userPart ? userPart.charAt(0).toUpperCase() + userPart.slice(1) : '';
      }).filter(Boolean);

      const recordLocs = records.map(r => r["Location"]).filter(Boolean);
      const dropdownLocs = dropdowns.location?.values || [];

      const persons = [...new Set([...recordPersons, ...dropdownPersons, ...userPersons])]
        .filter(n => n.toLowerCase() !== 'agent')
        .sort();

      const locs = [...new Set([...recordLocs, ...dropdownLocs])]
        .filter(l => l.toLowerCase() !== 'location')
        .sort();

      setUniqueLocations(locs);
      setUniquePersons(persons);
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Navigation (No Sidebars) */}
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-900/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight leading-none">FusionStays</h1>
            <span className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase">Team Member Workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200">{user?.email}</span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Session
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="max-w-xl w-full text-center space-y-8">
          
          {/* Welcome Title */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-amber-400 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Welcome back, {cleanName}!</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Team Member Lead Hub
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Select an action below to create a new internal lead or access your team workspace.
            </p>
          </div>

          {/* Centered Action Buttons Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* 1. Create Lead Button */}
            <button
              onClick={() => navigate('/leads?create=true')}
              className="group relative bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-2xl p-6 shadow-xl shadow-rose-950/50 border border-rose-500/30 flex flex-col items-center justify-center gap-3 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-base text-white">Create Lead</span>
                <span className="text-xs text-rose-100/80 font-semibold">Open lead section to add leads</span>
              </div>
            </button>

            {/* 2. Dashboard Button */}
            <button
              onClick={() => navigate('/reports')}
              className="group relative bg-slate-800/90 hover:bg-slate-800 text-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-950/50 border border-slate-700 flex flex-col items-center justify-center gap-3 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-700/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-base text-white">Dashboard</span>
                <span className="text-xs text-slate-400 font-medium">Open analytics & report dashboard</span>
              </div>
            </button>

          </div>

          <div className="pt-6 border-t border-slate-800/60 flex justify-center items-center gap-2 text-xs text-slate-500 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Authenticated as Team Member ({cleanName})</span>
          </div>

        </div>
      </main>

      {/* Lead Creation Modal */}
      {isUploadOpen && (
        <LeadUploadModal
          onClose={() => setIsUploadOpen(false)}
          onComplete={() => {
            setIsUploadOpen(false);
            setSubmittedLeadsCount(prev => prev + 1);
            alert('Lead submitted successfully!');
          }}
          uniquePersons={uniquePersons}
          uniqueLocations={uniqueLocations}
        />
      )}
    </div>
  );
}
