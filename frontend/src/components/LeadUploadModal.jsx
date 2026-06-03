import React, { useState } from 'react';
import { X, Home, Link2, Phone, MapPin, UserCheck } from 'lucide-react';
import api from '../api';

const LeadUploadModal = ({ onClose, onComplete, uniquePersons = [], uniqueLocations = [] }) => {
  const [propertyName, setPropertyName] = useState('');
  const [linkToProperty, setLinkToProperty] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propertyName.trim()) {
      setError('Property Name is required');
      return;
    }
    if (!location) {
      setError('Please select a location');
      return;
    }
    if (!assignedTo) {
      setError('Please assign this lead to a team member');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('Name of Property', propertyName.trim());
    formData.append('Link to Property', linkToProperty.trim());
    formData.append('Phone Number', phoneNumber.trim());
    formData.append('Location', location);
    formData.append('Assigned To', assignedTo);

    try {
      await api.post('/leads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onComplete();
    } catch (err) {
      console.error('Lead upload failed', err);
      setError(err.response?.data?.message || 'Failed to upload lead. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Create & Assign Lead</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Input lead details and assign to a team member</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Container */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold p-3 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          {/* Property Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Property Name *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Home className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Ocean View Suite"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 transition-all focus:outline-none"
              />
            </div>
          </div>

          {/* Listing Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Link to listing</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={linkToProperty}
                onChange={(e) => setLinkToProperty(e.target.value)}
                placeholder="https://airbnb.com/rooms/..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 transition-all focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 transition-all focus:outline-none"
                />
              </div>
            </div>

            {/* Location Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Location *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 transition-all focus:outline-none appearance-none"
                >
                  <option value="">Select location...</option>
                  {uniqueLocations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assigned To Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Assign Lead To *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <select
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 transition-all focus:outline-none appearance-none"
              >
                <option value="">Select a team member...</option>
                {uniquePersons.map(person => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl py-2.5 px-5 shadow-lg shadow-brand-200/50 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Save & Assign Lead'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadUploadModal;
