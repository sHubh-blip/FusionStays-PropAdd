import React, { useState } from 'react';
import { X, UploadCloud, Image as ImageIcon } from 'lucide-react';
import api from '../api';

const LeadUploadModal = ({ onClose, onComplete, uniquePersons = [] }) => {
  const [file, setFile] = useState(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a screenshot to upload.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      formData.append('assignedTo', assignedTo);

      await api.post('/leads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onComplete();
    } catch (err) {
      console.error(err);
      setError('Failed to upload lead. Check configuration.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-lg tracking-tight">Upload Internal Lead</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Screenshot</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => { setFile(e.target.files[0]); setError(''); }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex flex-col items-center">
                  <ImageIcon className="w-10 h-10 text-brand-500 mb-2" />
                  <span className="text-sm font-medium text-slate-700 text-center max-w-[200px] truncate">{file.name}</span>
                  <span className="text-xs text-slate-500 mt-1">Click to change</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-600">Click or drag image here</span>
                  <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Assign To (Optional)</label>
            <div className="relative">
              <select 
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm appearance-none font-medium text-slate-700"
              >
                <option value="">-- Select Member --</option>
                {uniquePersons.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-md transition flex items-center justify-center min-w-[120px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Upload Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadUploadModal;
