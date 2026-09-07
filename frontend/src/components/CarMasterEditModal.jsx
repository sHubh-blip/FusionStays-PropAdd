import React, { useState } from 'react';
import { X, Save, Calendar, User, Phone, MapPin, DollarSign, AlertCircle } from 'lucide-react';
import api from '../api';

const STATUS_OPTIONS = [
  'Car Package Enquiry',
  'In Progress',
  'Rates Shared',
  'Confirmed',
  'Not Confirmed'
];

const CarMasterEditModal = ({ booking, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    "Guest Name": booking["Guest Name"] || '',
    "Contact No": booking["Contact No"] || '',
    "Pax": booking["Pax"] || '2',
    "Start City": booking["Start City"] || 'NJP',
    "Start Date": booking["Start Date"] || '',
    "End Date": booking["End Date"] || '',
    "Booking Month": booking["Booking Month"] || '',
    "Total Sales": booking["Total Sales"] || '',
    "Billing Amt": booking["Billing Amt"] || '',
    "GST amt": booking["GST amt"] || '',
    "Purchase Cost": booking["Purchase Cost"] || '',
    "Profit": booking["Profit"] || '',
    "Advance Recieved": booking["Advance Recieved"] || '',
    "Due Collection": booking["Due Collection"] || 'Guest Collection',
    "Status": booking["Status"] || 'Confirmed',
    "Name": booking["Name"] || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, val) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: val };

      // Recompute profit: Profit = Billing Amt - Purchase Cost
      if (field === 'totalSales') {
        const sales = parseFloat(val) || 0;
        if (sales > 0) {
          const base = Math.round(sales / 1.05);
          updated["Billing Amt"] = base.toString();
          updated["GST amt"] = (sales - base).toString();
          const cost = parseFloat(updated["Purchase Cost"]) || 0;
          updated["Profit"] = (base - cost).toString();
        }
      } else if (field === 'Billing Amt' || field === 'Purchase Cost') {
        const billing = parseFloat(updated["Billing Amt"]) || 0;
        const cost = parseFloat(updated["Purchase Cost"]) || 0;
        updated["Profit"] = (billing - cost).toString();
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');
      
      const recordId = booking._rowIndex || booking["Booking ID"] || booking["Vendorwise ID"];
      await api.put(`/car-packages/master/${encodeURIComponent(recordId)}`, formData);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update master booking:", err);
      setError(err.response?.data?.message || err.message || "Failed to update booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-indigo-700 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Edit Car Booking Entry</h3>
            <p className="text-xs text-brand-100 mt-0.5">
              Booking ID: <span className="font-mono font-semibold">{booking["Booking ID"] || booking["Vendorwise ID"]}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-brand-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50 custom-scrollbar text-xs">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Guest Info */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">
              Booking & Guest Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Guest Name *</label>
                <input
                  type="text"
                  value={formData["Guest Name"]}
                  onChange={(e) => handleChange("Guest Name", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Contact Number *</label>
                <input
                  type="text"
                  value={formData["Contact No"]}
                  onChange={(e) => handleChange("Contact No", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Handled By</label>
                <input
                  type="text"
                  value={formData["Name"]}
                  onChange={(e) => handleChange("Name", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Start City</label>
                <input
                  type="text"
                  value={formData["Start City"]}
                  onChange={(e) => handleChange("Start City", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Pax</label>
                <input
                  type="text"
                  value={formData["Pax"]}
                  onChange={(e) => handleChange("Pax", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Status *</label>
                <select
                  value={formData["Status"]}
                  onChange={(e) => handleChange("Status", e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg font-bold text-amber-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Start Date</label>
                <input
                  type="text"
                  value={formData["Start Date"]}
                  onChange={(e) => handleChange("Start Date", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="e.g. 15-October-2026"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">End Date</label>
                <input
                  type="text"
                  value={formData["End Date"]}
                  onChange={(e) => handleChange("End Date", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="e.g. 18-October-2026"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Booking Month</label>
                <input
                  type="text"
                  value={formData["Booking Month"]}
                  onChange={(e) => handleChange("Booking Month", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">
              Financial Calculations & Payments
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Total Sales (₹)</label>
                <input
                  type="number"
                  value={formData["Total Sales"]}
                  onChange={(e) => handleChange("totalSales", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Billing Amount (Base ₹)</label>
                <input
                  type="number"
                  value={formData["Billing Amt"]}
                  onChange={(e) => handleChange("Billing Amt", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Purchase Cost (₹)</label>
                <input
                  type="number"
                  value={formData["Purchase Cost"]}
                  onChange={(e) => handleChange("Purchase Cost", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-rose-600 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Profit = Billing - Cost (₹)</label>
                <input
                  type="number"
                  value={formData["Profit"]}
                  onChange={(e) => handleChange("Profit", e.target.value)}
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg font-black text-amber-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Advance Received (₹)</label>
                <input
                  type="number"
                  value={formData["Advance Recieved"]}
                  onChange={(e) => handleChange("Advance Recieved", e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Due Collection</label>
                <input
                  type="text"
                  value={formData["Due Collection"]}
                  onChange={(e) => handleChange("Due Collection", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
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
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving to Google Sheet...' : 'Update Booking'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CarMasterEditModal;
