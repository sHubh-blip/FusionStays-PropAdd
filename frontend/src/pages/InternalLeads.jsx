import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Image as ImageIcon, CheckCircle, Clock, Shield, UserCheck, Lock } from 'lucide-react';
import api from '../api';
import LeadUploadModal from '../components/LeadUploadModal';
import RecordFormModal from '../components/RecordFormModal';

const LEAD_STATUS_OPTIONS = ['Pending', 'In Progress', 'Contacted', 'Rejected', 'Added'];

const InternalLeads = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // For dropdown lists in modals
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [uniquePersons, setUniquePersons] = useState([]);

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const isAssignee = (assignedToVal) => {
    if (!assignedToVal) return false;
    const target = assignedToVal.trim().toLowerCase();
    if (!target || target === 'unassigned') return false;

    const uEmail = (user?.email || '').toLowerCase();
    const uName = (user?.name || '').toLowerCase();
    const uUsername = uEmail.split('@')[0];

    if (uEmail && target === uEmail) return true;
    if (uUsername && target === uUsername) return true;
    if (uName && target === uName) return true;
    if (uEmail && (uEmail.startsWith(target) || target.includes(uUsername))) return true;
    return false;
  };

  const canChangeStatus = (lead) => isAdmin || isAssignee(lead['Assigned To']);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/leads');
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch leads', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecordsForDropdowns = async () => {
    try {
      const response = await api.get('/records?paginate=false');
      const records = response.data?.data || [];
      
      const locs = [...new Set(records.map(r => r["Location"]).filter(Boolean))].sort();
      const persons = [...new Set(records.map(r => r["Name of Person"]).filter(Boolean))].sort();
      
      setUniqueLocations(locs);
      setUniquePersons(persons);
    } catch (err) {
      console.error("Failed to fetch dropdown options:", err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchRecordsForDropdowns();
  }, []);

  const handleUploadComplete = () => {
    setIsUploadOpen(false);
    fetchLeads();
  };

  const handleAssignLead = async (lead, newAssignee) => {
    const leadId = lead._id || lead._rowIndex;
    if (!leadId) return;

    try {
      await api.put(`/leads/${leadId}`, { "Assigned To": newAssignee });
      setLeads(prev => prev.map(l => {
        if ((l._id || l._rowIndex) === leadId) {
          return { ...l, "Assigned To": newAssignee };
        }
        return l;
      }));
    } catch (error) {
      console.error('Failed to assign lead', error);
      alert(error.response?.data?.message || 'Only Admins can assign leads.');
      fetchLeads();
    }
  };

  const handleStatusChange = async (lead, newStatus) => {
    const leadId = lead._id || lead._rowIndex;
    if (!leadId) return;
    setStatusUpdatingId(leadId);

    try {
      await api.put(`/leads/${leadId}`, { "Status": newStatus });
      setLeads(prev => prev.map(l => {
        if ((l._id || l._rowIndex) === leadId) {
          return { ...l, "Status": newStatus };
        }
        return l;
      }));
    } catch (error) {
      console.error('Failed to update lead status', error);
      alert(error.response?.data?.message || 'Only Admin or Assignee can update lead status.');
      fetchLeads();
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleAddToDatabase = (lead) => {
    setSelectedLead(lead);
    setIsRecordModalOpen(true);
  };

  const handleRecordSave = async (formData) => {
    try {
      // 1. Save to main records
      await api.post('/records', formData);
      // 2. Mark lead as added
      if (selectedLead && (selectedLead._id || selectedLead._rowIndex)) {
        const leadId = selectedLead._id || selectedLead._rowIndex;
        await api.put(`/leads/${leadId}`, { Status: 'Added' });
      }
      setIsRecordModalOpen(false);
      fetchLeads();
    } catch (error) {
      console.error('Failed to save record and update lead', error);
      alert('Failed to save. Check console.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={() => navigate('/dashboard')} className="mr-4 p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-sm">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">Internal Leads</h1>
                {isAdmin && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200">
                    <Shield className="w-3 h-3" /> Admin Mode
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-1">Review internal property leads and manage assignments.</p>
            </div>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl py-2.5 px-5 shadow-md flex items-center transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Submit Internal Lead
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="p-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div></div>
          ) : leads.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Internal Leads</h3>
              <p className="text-slate-500 max-w-sm mt-2 text-sm">Submit a lead to share property details with the team.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                    <th className="py-4 px-6 w-[15%]">Date Added</th>
                    <th className="py-4 px-6 w-[35%]">Property Details</th>
                    <th className="py-4 px-6 w-[20%]">
                      <div className="flex items-center gap-1">
                        Assigned To
                        {isAdmin && <Shield className="w-3 h-3 text-amber-500" title="Only Admin can assign leads" />}
                      </div>
                    </th>
                    <th className="py-4 px-6 w-[15%]">Status</th>
                    <th className="py-4 px-6 w-[15%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead, idx) => {
                    const canEditStatus = canChangeStatus(lead);
                    const leadId = lead._id || lead._rowIndex || idx;

                    return (
                      <tr key={leadId} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6 text-sm text-slate-600 font-medium">{lead['Date Added']}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1 max-w-[320px]">
                            <span className="font-bold text-slate-800 text-sm">{lead['Name of Property'] || 'Unnamed Property'}</span>
                            {lead['Location'] && (
                              <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">📍 {lead['Location']}</span>
                            )}
                            {lead['Phone Number'] && (
                              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">📞 {lead['Phone Number']}</span>
                            )}
                            {lead['Link to Property'] && (
                              <a 
                                href={lead['Link to Property']} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-brand-600 hover:text-brand-700 underline font-medium truncate max-w-[280px]"
                              >
                                🔗 Link to Listing
                              </a>
                            )}
                          </div>
                        </td>
                        
                        {/* Assigned To Column - ONLY Admin can assign/reassign */}
                        <td className="py-4 px-6">
                          {isAdmin ? (
                            <div className="relative inline-block">
                              <select
                                value={lead['Assigned To'] || 'Unassigned'}
                                onChange={(e) => handleAssignLead(lead, e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs py-1.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 hover:bg-slate-100 transition-colors cursor-pointer appearance-none pr-7"
                              >
                                <option value="Unassigned">Unassigned</option>
                                {uniquePersons.map(person => (
                                  <option key={person} value={person}>{person}</option>
                                ))}
                              </select>
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-800">
                              {lead['Assigned To'] && lead['Assigned To'] !== 'Unassigned' ? (
                                lead['Assigned To']
                              ) : (
                                <span className="text-slate-400 font-medium italic">Unassigned</span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Status Column - Changeable by Admin or Assignee ONLY */}
                        <td className="py-4 px-6">
                          {canEditStatus && lead['Status'] !== 'Added' ? (
                            <select
                              value={lead['Status'] || 'Pending'}
                              disabled={statusUpdatingId === leadId}
                              onChange={(e) => handleStatusChange(lead, e.target.value)}
                              className={`text-xs font-bold py-1 px-3 rounded-full border shadow-sm cursor-pointer focus:outline-none transition-all ${
                                lead['Status'] === 'Added'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : lead['Status'] === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : lead['Status'] === 'In Progress' || lead['Status'] === 'Contacted'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                            >
                              {LEAD_STATUS_OPTIONS.filter(s => s !== 'Added').map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                              lead['Status'] === 'Added' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : lead['Status'] === 'Rejected'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {lead['Status'] === 'Added' ? <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> : <Clock className="w-3.5 h-3.5 mr-1.5" />}
                              {lead['Status'] || 'Pending'}
                            </span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="py-4 px-6 text-right">
                          {lead['Status'] !== 'Added' && (
                            canEditStatus ? (
                              <button
                                onClick={() => handleAddToDatabase(lead)}
                                className="text-xs bg-white border border-slate-200 text-slate-700 hover:bg-brand-600 hover:text-white hover:border-transparent px-3.5 py-2 rounded-xl transition-all font-semibold shadow-sm focus:outline-none"
                              >
                                Add to Database
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Only Admin or the assigned team member can add this lead to database"
                                className="text-xs bg-slate-50 border border-slate-200 text-slate-400 px-3 py-1.5 rounded-xl cursor-not-allowed flex items-center gap-1 ml-auto font-medium"
                              >
                                <Lock className="w-3 h-3" /> Assigned Only
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isUploadOpen && (
        <LeadUploadModal
          onClose={() => setIsUploadOpen(false)}
          onComplete={handleUploadComplete}
          uniquePersons={uniquePersons}
          uniqueLocations={uniqueLocations}
        />
      )}

      {isRecordModalOpen && (
        <RecordFormModal
          record={{ 
            "Source": "Internal Lead",
            "Name of property": selectedLead?.["Name of Property"] || '',
            "Location": selectedLead?.["Location"] || '',
            "Phone Number": selectedLead?.["Phone Number"] || '',
            "Details": selectedLead?.["Link to Property"] ? `Listing: ${selectedLead["Link to Property"]}` : ''
          }}
          onClose={() => setIsRecordModalOpen(false)}
          onSave={handleRecordSave}
          user={user}
          uniqueLocations={uniqueLocations}
          uniquePersons={uniquePersons}
        />
      )}
    </div>
  );
};

export default InternalLeads;
