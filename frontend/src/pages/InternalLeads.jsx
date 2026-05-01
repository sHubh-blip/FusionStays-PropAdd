import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';
import api from '../api';
import LeadUploadModal from '../components/LeadUploadModal';
import RecordFormModal from '../components/RecordFormModal';

const InternalLeads = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  
  // We need these for RecordFormModal
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [uniquePersons, setUniquePersons] = useState([]);

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
          const { data } = await api.get('/records');
          if (Array.isArray(data)) {
              const locs = [...new Set(data.map(r => r["Location"]).filter(Boolean))].sort();
              const persons = [...new Set(data.map(r => r["Name of Person"]).filter(Boolean))].sort();
              setUniqueLocations(locs);
              setUniquePersons(persons);
          }
      } catch (err) {
          console.error(err);
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

  // Construct correct URL for the image
  const getImageUrl = (url) => {
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace('/api', '') + url;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={() => navigate('/dashboard')} className="mr-4 p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Internal Leads (To Be Added)</h1>
          </div>
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl py-2.5 px-5 shadow-md flex items-center transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload New Lead
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
                <p className="text-slate-500 max-w-sm mt-2 text-sm">Upload a screenshot of a potential property and assign it to a team member to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                    <th className="py-4 px-6 w-1/5">Date Added</th>
                    <th className="py-4 px-6 w-1/4">Screenshot</th>
                    <th className="py-4 px-6 w-1/4">Assigned To</th>
                    <th className="py-4 px-6 w-[15%]">Status</th>
                    <th className="py-4 px-6 w-[15%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead, idx) => (
                    <tr key={lead._id || lead._rowIndex || idx} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6 text-sm text-slate-600 font-medium">{lead['Date Added']}</td>
                      <td className="py-4 px-6">
                        <a href={getImageUrl(lead['Screenshot URL'])} target="_blank" rel="noreferrer" className="inline-flex items-center bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          View Image
                        </a>
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-slate-800">{lead['Assigned To'] || <span className="text-slate-400 font-medium">Unassigned</span>}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${lead['Status'] === 'Added' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                          {lead['Status'] === 'Added' ? <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> : <Clock className="w-3.5 h-3.5 mr-1.5" />}
                          {lead['Status']}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {lead['Status'] !== 'Added' && (
                          <button 
                            onClick={() => handleAddToDatabase(lead)}
                            className="text-sm bg-white border border-slate-200 text-slate-600 hover:bg-brand-600 hover:text-white hover:border-transparent px-4 py-2 rounded-xl transition-all font-semibold shadow-sm focus:outline-none"
                          >
                            Add to Database
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
        />
      )}

      {isRecordModalOpen && (
        <RecordFormModal 
          record={{ "Source": "Internal Lead" }} // Pre-fill source
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
