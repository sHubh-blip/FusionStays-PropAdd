import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, CreditCard, DollarSign, User, Calendar, Car, AlertCircle, Building2 } from 'lucide-react';
import api from '../api';

const STATUS_OPTIONS = [
  { value: 'To be paid', label: 'To be paid', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'Paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'Vendor Confirmed', label: 'Vendor Confirmed', color: 'bg-teal-800 text-white border-teal-900' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-rose-100 text-rose-800 border-rose-300' }
];

const CarPaymentStatusModal = ({ booking, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    "Vendorwise ID": "",
    "Guest Name": "",
    "Date": "",
    "Car Type": "",
    "Purchase Price": "",
    "Advance to be Paid": "",
    "Advance Status": "To be paid",
    "Secondary Advance": "",
    "Secondary Advance Status": "To be paid",
    "Guest Collection": "",
    "Vendor": "",
    "Remarks": ""
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [availableVendors, setAvailableVendors] = useState([]);

  const vendorwiseId = booking?.["Vendorwise ID"] || booking?.["Booking ID"] || "";

  useEffect(() => {
    const fetchAccountData = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        // Fetch specific account entry
        const res = await api.get(`/car-packages/accounts/${encodeURIComponent(vendorwiseId)}`);
        if (res.data && res.data.account) {
          const acc = res.data.account;
          setFormData({
            "Vendorwise ID": acc["Vendorwise ID"] || vendorwiseId,
            "Guest Name": acc["Guest Name"] || booking?.["Guest Name"] || "",
            "Date": acc["Date"] || booking?.["Start Date"] || booking?.["Booking Date"] || "",
            "Car Type": acc["Car Type"] || booking?.["Car Type"] || "",
            "Purchase Price": acc["Purchase Price"] || booking?.["Purchase Cost"] || "0",
            "Advance to be Paid": acc["Advance to be Paid"] || booking?.["Advance Recieved"] || "0",
            "Advance Status": acc["Advance Status"] || "To be paid",
            "Secondary Advance": acc["Secondary Advance"] || "",
            "Secondary Advance Status": acc["Secondary Advance Status"] || "To be paid",
            "Guest Collection": acc["Guest Collection"] || booking?.["Due Collection"] || "",
            "Vendor": acc["Vendor"] || booking?.["Vendor"] || "",
            "Remarks": acc["Remarks"] || ""
          });
        }
      } catch (err) {
        // Fallback to booking props if account record doesn't exist yet
        setFormData({
          "Vendorwise ID": vendorwiseId,
          "Guest Name": booking?.["Guest Name"] || "",
          "Date": booking?.["Start Date"] || booking?.["Booking Date"] || "",
          "Car Type": booking?.["Car Type"] || "",
          "Purchase Price": booking?.["Purchase Cost"] || "0",
          "Advance to be Paid": booking?.["Advance Recieved"] || "0",
          "Advance Status": booking?.["Advance Status"] || "To be paid",
          "Secondary Advance": "",
          "Secondary Advance Status": "To be paid",
          "Guest Collection": booking?.["Due Collection"] || "",
          "Vendor": booking?.["Vendor"] || "",
          "Remarks": ""
        });
      } finally {
        setIsLoading(false);
      }

      // Fetch vendors list for dropdown
      try {
        const daywiseRes = await api.get('/car-packages/daywise?paginate=false');
        if (daywiseRes.data?.filters?.vendors) {
          setAvailableVendors(daywiseRes.data.filters.vendors);
        }
      } catch (e) {}
    };

    if (vendorwiseId) {
      fetchAccountData();
    }
  }, [vendorwiseId, booking]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await api.put(`/car-packages/accounts/${encodeURIComponent(vendorwiseId)}`, formData);
      setSuccessMsg("Payment status & vendor accounting details saved successfully!");
      if (onSuccess) {
        onSuccess(formData);
      }
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error("Failed to save account record:", err);
      setErrorMsg(err.response?.data?.message || "Failed to save payment status to Google Sheets.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Vendor Payment & Accounts</h3>
                <span className="bg-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded-md font-mono font-bold">
                  {vendorwiseId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {formData["Guest Name"] || booking?.["Guest Name"] || "Guest"} • Update payment status & vendor ledger
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-xs font-semibold">Loading payment details from Google Sheets...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            
            {/* Advance Status Highlight Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                Primary Advance Payment Status <span className="text-rose-500">*</span>
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_OPTIONS.map(opt => {
                  const isSelected = formData["Advance Status"] === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => handleChange("Advance Status", opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                        isSelected 
                          ? `${opt.color} shadow-sm ring-2 ring-brand-500 ring-offset-1` 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financial Amounts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Purchase Price (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData["Purchase Price"]}
                    onChange={(e) => handleChange("Purchase Price", e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-medium"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Advance to be Paid (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData["Advance to be Paid"]}
                    onChange={(e) => handleChange("Advance to be Paid", e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-bold text-amber-700"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Guest Collection (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData["Guest Collection"]}
                    onChange={(e) => handleChange("Guest Collection", e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-medium text-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Secondary Advance Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50/60 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Secondary Advance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData["Secondary Advance"]}
                    onChange={(e) => handleChange("Secondary Advance", e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-medium"
                    placeholder="Optional amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Secondary Advance Status
                </label>
                <select
                  value={formData["Secondary Advance Status"]}
                  onChange={(e) => handleChange("Secondary Advance Status", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-medium bg-white"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vendor & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Vendor / Driver
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="vendors-list"
                    value={formData["Vendor"]}
                    onChange={(e) => handleChange("Vendor", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-medium"
                    placeholder="Enter or select vendor..."
                  />
                  <datalist id="vendors-list">
                    {availableVendors.map((v, i) => (
                      <option key={i} value={v} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Car Type
                </label>
                <input
                  type="text"
                  value={formData["Car Type"]}
                  onChange={(e) => handleChange("Car Type", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-medium"
                  placeholder="e.g. Bolero / WagonR"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Remarks / Payment Notes
              </label>
              <textarea
                rows={2}
                value={formData["Remarks"]}
                onChange={(e) => handleChange("Remarks", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Add transaction reference, bank note, or payment remark..."
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving to Google Sheet...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Payment Status
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default CarPaymentStatusModal;
