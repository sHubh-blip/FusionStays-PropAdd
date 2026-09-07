import React, { useState } from 'react';
import { X, Save, Calendar, User, Phone, MapPin, Car, Building2, AlertCircle } from 'lucide-react';
import api from '../api';

const CarDaywiseEditModal = ({ dayRow, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    "Start Date": dayRow["Start Date"] || '',
    "From": dayRow["From"] || '',
    "To": dayRow["To"] || '',
    "Car Type": dayRow["Car Type"] || '',
    "No of Cars": dayRow["No of Cars"] || '1',
    "Vendor": dayRow["Vendor"] || '',
    "Itinerary": dayRow["Itinerary"] || '',
    "Name": dayRow["Name"] || '',
    "Guest Name": dayRow["Guest Name"] || '',
    "Contact No": dayRow["Contact No"] || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');
      
      const recordId = dayRow._rowIndex || dayRow["Booking ID"];
      await api.put(`/car-packages/daywise/${encodeURIComponent(recordId)}`, formData);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update daywise entry:", err);
      setError(err.response?.data?.message || err.message || "Failed to update daywise entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-700 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Edit Daywise Route & Allocation</h3>
            <p className="text-xs text-teal-100 mt-0.5">
              Booking: <span className="font-mono font-semibold">{dayRow["Booking ID"] || dayRow["Vendorwise ID"]}</span> • {dayRow["Guest Name"]}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-teal-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50 custom-scrollbar text-xs">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Date</label>
              <input
                type="text"
                value={formData["Start Date"]}
                onChange={(e) => handleChange("Start Date", e.target.value)}
                placeholder="e.g. 15-October-2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Handled By</label>
              <input
                type="text"
                value={formData["Name"]}
                onChange={(e) => handleChange("Name", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">From</label>
              <input
                type="text"
                value={formData["From"]}
                onChange={(e) => handleChange("From", e.target.value)}
                placeholder="e.g. NJP"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-semibold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">To</label>
              <input
                type="text"
                value={formData["To"]}
                onChange={(e) => handleChange("To", e.target.value)}
                placeholder="e.g. Darjeeling"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-semibold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Car Type</label>
              <input
                type="text"
                value={formData["Car Type"]}
                onChange={(e) => handleChange("Car Type", e.target.value)}
                placeholder="e.g. WagonR / Innova"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Number of Cars</label>
              <input
                type="number"
                value={formData["No of Cars"]}
                onChange={(e) => handleChange("No of Cars", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Assigned Vendor</label>
              <input
                type="text"
                value={formData["Vendor"]}
                onChange={(e) => handleChange("Vendor", e.target.value)}
                placeholder="e.g. Samragi Homestays"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Itinerary / Sightseeing Plan</label>
              <textarea
                rows={3}
                value={formData["Itinerary"]}
                onChange={(e) => handleChange("Itinerary", e.target.value)}
                placeholder="Describe sightseeing and route..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving to Google Sheet...' : 'Update Daywise Route'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CarDaywiseEditModal;
