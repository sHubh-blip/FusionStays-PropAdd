import React, { useState } from 'react';
import { X, Upload, CheckCircle } from 'lucide-react';
import api from '../api';

const LeadUploadModal = ({ onClose, onComplete, uniquePersons = [] }) => {
  const [file, setFile] = useState(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a screenshot');
      return;
    }
    if (!assignedTo) {
      setError('Please assign to a team member');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('screenshot', file);
    formData.append('Assigned To', assignedTo);

    try {
      await api.post('/leads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onComplete();
    } catch (err) {
      console.error('Upload failed', err);
      setError(err.response?.data?.message || 'Failed to upload lead. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-lg">Upload New Lead</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Screenshot</label>
            <div 
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 hover:border-brand-400 hover:bg-slate-100/50'}`}
              onClick={() => document.getElementById('screenshot-input').click()}
            >
              <input
                id="screenshot-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-brand-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Drop image here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse from files</p>
                </div>
              )}
            </div>
          </div>

          {/* Assigned To Select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Assign To</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-800 transition-all shadow-sm"
            >
              <option value="">Select a team member...</option>
              {uniquePersons.map(person => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium p-3 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl py-3 px-5 shadow-lg shadow-brand-200/50 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Upload & Assign'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadUploadModal;
