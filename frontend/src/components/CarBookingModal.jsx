import React, { useState, useEffect, useContext, useRef } from 'react';
import { X, Save, Plus, Trash2, Calendar, User, Phone, MapPin, DollarSign, Car, Building2, AlertCircle, ChevronDown } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

// Helper: converts YYYY-MM-DD from <input type="date"> to "15-October-2026"
const formatToDisplayDate = (isoStr) => {
  if (!isoStr) return '';
  try {
    const [y, m, d] = isoStr.split('-');
    if (y && m && d) {
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return `${parseInt(d, 10)}-${monthNames[dateObj.getMonth()]}-${y}`;
    }
    return isoStr;
  } catch (_) {
    return isoStr;
  }
};

// Helper: converts "15-October-2026" or similar to "2026-10-15" for <input type="date">
const formatToISODate = (displayStr) => {
  if (!displayStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayStr)) return displayStr;
  try {
    const parts = displayStr.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthStr = parts[1].toLowerCase();
      const year = parts[2];
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = months.findIndex(m => monthStr.startsWith(m));
      if (mIdx !== -1) {
        const monthNum = String(mIdx + 1).padStart(2, '0');
        return `${year}-${monthNum}-${day}`;
      }
    }
    const d = new Date(displayStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (_) {}
  return '';
};

// Smart Autocomplete Input Component
const SmartSearchInput = ({
  value = '',
  onChange,
  options = [],
  placeholder = '',
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    if (!opt) return false;
    const str = String(opt).trim();
    if (!value) return true;
    return str.toLowerCase().includes(value.toLowerCase());
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl custom-scrollbar py-1">
          {filteredOptions.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center justify-between"
            >
              <span>{opt}</span>
              {value && opt.toLowerCase() === value.toLowerCase() && (
                <span className="text-[10px] text-brand-600 font-bold">Selected</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CarBookingModal = ({ onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Distinct options loaded from existing daywise & master records
  const [dropdownOptions, setDropdownOptions] = useState({
    fromCities: ['NJP', 'Siliguri', 'Bagdogra', 'Darjeeling', 'Gangtok', 'Kalimpong', 'Pelling', 'Lachung', 'Lachen'],
    toCities: ['Darjeeling', 'Gangtok', 'Kalimpong', 'Pelling', 'Lachung', 'Lachen', 'NJP', 'Bagdogra', 'Siliguri'],
    carTypes: ['WagonR', 'Innova', 'Sumo', 'Bolero', 'Swift Dzire', 'Ertiga', 'Scorpio', 'Crysta', 'Tempo Traveller'],
    vendors: ['Samragi Homestays', 'Mahakal Resort', 'Darjeeling Travels', 'Sikkim Cabs', 'Himalayan Wheels'],
    itineraries: [
      'Pickup from NJP and proceed to hotel with sightseeing en route.',
      'Local sightseeing and transfers as per package schedule.',
      'Drop to NJP Railway Station / Bagdogra Airport.'
    ]
  });

  // Fetch unique past values for smart autocomplete
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/car-packages/daywise?paginate=false');
        const rows = res.data.data || [];
        if (rows.length > 0) {
          const fromSet = new Set(dropdownOptions.fromCities);
          const toSet = new Set(dropdownOptions.toCities);
          const carSet = new Set(dropdownOptions.carTypes);
          const vendorSet = new Set(dropdownOptions.vendors);
          const itinSet = new Set(dropdownOptions.itineraries);

          rows.forEach(r => {
            if (r.From) fromSet.add(r.From.trim());
            if (r.To) toSet.add(r.To.trim());
            if (r["Car Type"]) carSet.add(r["Car Type"].trim());
            if (r.Vendor) vendorSet.add(r.Vendor.trim());
            if (r.Itinerary) itinSet.add(r.Itinerary.trim());
          });

          setDropdownOptions({
            fromCities: [...fromSet].filter(Boolean),
            toCities: [...toSet].filter(Boolean),
            carTypes: [...carSet].filter(Boolean),
            vendors: [...vendorSet].filter(Boolean),
            itineraries: [...itinSet].filter(Boolean)
          });
        }
      } catch (err) {
        console.warn("Could not fetch daywise autocomplete options:", err);
      }
    };
    fetchOptions();
  }, []);

  // Master Details State
  const [masterData, setMasterData] = useState({
    bookingId: `CAR-${new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    bookingDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    bookingMonth: new Date().toLocaleString('en-US', { month: 'short' }),
    startDate: '',
    checkInMonth: new Date().toLocaleString('en-US', { month: 'short' }),
    endDate: '',
    name: user?.name || '',
    guestName: '',
    contactNo: '',
    pax: '2',
    startCity: '',
    billingAmt: '',
    gstAmt: '',
    totalSales: '',
    purchaseCost: '',
    profit: '',
    advanceReceived: '',
    dueCollection: 'Guest Collection',
    status: 'Confirmed'
  });

  useEffect(() => {
    if (user?.name && !masterData.name) {
      setMasterData(prev => ({ ...prev, name: user.name }));
    }
  }, [user]);

  // Daywise Itinerary state: initialized with empty values (not pre-filled)
  const [daywiseRows, setDaywiseRows] = useState([
    {
      startDate: '',
      from: '',
      to: '',
      itinerary: '',
      carType: '',
      noOfCars: '1',
      vendor: ''
    }
  ]);

  const handleMasterDateChange = (field, isoDateVal) => {
    const formatted = formatToDisplayDate(isoDateVal);
    setMasterData(prev => {
      const updated = { ...prev, [field]: formatted };
      if (field === 'startDate' && isoDateVal) {
        try {
          const d = new Date(isoDateVal);
          if (!isNaN(d.getTime())) {
            updated.checkInMonth = d.toLocaleString('en-US', { month: 'short' });
          }
        } catch (_) {}
      }
      return updated;
    });
  };

  const handleMasterChange = (field, val) => {
    setMasterData(prev => {
      const updated = { ...prev, [field]: val };
      
      // Auto compute profit: Profit = Billing Amount - Purchase Cost
      // If totalSales changes, update billingAmt (base) & gstAmt
      if (field === 'totalSales') {
        const sales = parseFloat(val) || 0;
        if (sales > 0) {
          const base = Math.round(sales / 1.05);
          updated.billingAmt = base.toString();
          updated.gstAmt = (sales - base).toString();
          const cost = parseFloat(updated.purchaseCost) || 0;
          updated.profit = (base - cost).toString();
        }
      } else if (field === 'billingAmt' || field === 'purchaseCost') {
        const billing = parseFloat(updated.billingAmt) || 0;
        const cost = parseFloat(updated.purchaseCost) || 0;
        if (billing > 0 || cost > 0) {
          updated.profit = (billing - cost).toString();
        }
      }

      return updated;
    });
  };

  const handleDaywiseDateChange = (idx, isoDateVal) => {
    const formatted = formatToDisplayDate(isoDateVal);
    setDaywiseRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], startDate: formatted };
      return updated;
    });
  };

  const handleDaywiseChange = (idx, field, val) => {
    setDaywiseRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const addDaywiseRow = () => {
    setDaywiseRows(prev => [
      ...prev,
      {
        startDate: '',
        from: '',
        to: '',
        itinerary: '',
        carType: '',
        noOfCars: '1',
        vendor: ''
      }
    ]);
  };

  const removeDaywiseRow = (idx) => {
    if (daywiseRows.length === 1) return;
    setDaywiseRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!masterData.guestName.trim()) {
      setError('Guest Name is required');
      return;
    }
    if (!masterData.contactNo.trim()) {
      setError('Contact Number is required');
      return;
    }
    if (!masterData.startDate.trim()) {
      setError('Start Date is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await api.post('/car-packages/booking', {
        master: masterData,
        daywise: daywiseRows
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create car booking:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Car className="w-5 h-5 text-brand-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Create New Car Package Booking</h3>
              <p className="text-xs text-brand-100">
                Adds booking to Master and populates Daywise itinerary directly in Google Sheets
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-brand-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-slate-50">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Guest & Master Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <User className="w-4 h-4 text-brand-600" />
              1. Guest & Booking Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              <div>
                <label className="font-bold text-slate-700 block mb-1">Handled By (Team Member) *</label>
                <input
                  type="text"
                  value={masterData.name}
                  onChange={(e) => handleMasterChange('name', e.target.value)}
                  placeholder="e.g. Subhankar, Puja, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Booking ID</label>
                <input
                  type="text"
                  value={masterData.bookingId}
                  onChange={(e) => handleMasterChange('bookingId', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Guest Name *</label>
                <input
                  type="text"
                  value={masterData.guestName}
                  onChange={(e) => handleMasterChange('guestName', e.target.value)}
                  placeholder="e.g. Subrata Bose"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Number *</label>
                <input
                  type="text"
                  value={masterData.contactNo}
                  onChange={(e) => handleMasterChange('contactNo', e.target.value)}
                  placeholder="e.g. 9831036132"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              {/* Start Date Calendar Picker */}
              <div>
                <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>Start Date *</span>
                  {masterData.startDate && (
                    <span className="text-[10px] text-brand-600 font-semibold">{masterData.startDate}</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formatToISODate(masterData.startDate)}
                    onChange={(e) => handleMasterDateChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* End Date Calendar Picker */}
              <div>
                <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>End Date *</span>
                  {masterData.endDate && (
                    <span className="text-[10px] text-brand-600 font-semibold">{masterData.endDate}</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formatToISODate(masterData.endDate)}
                    onChange={(e) => handleMasterDateChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Start City</label>
                <SmartSearchInput
                  value={masterData.startCity}
                  onChange={(val) => handleMasterChange('startCity', val)}
                  options={dropdownOptions.fromCities}
                  placeholder="e.g. NJP / Siliguri / Bagdogra"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pax (Adults+Children)</label>
                <input
                  type="text"
                  value={masterData.pax}
                  onChange={(e) => handleMasterChange('pax', e.target.value)}
                  placeholder="e.g. 4 or 4+2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Check In Month</label>
                <input
                  type="text"
                  value={masterData.checkInMonth}
                  onChange={(e) => handleMasterChange('checkInMonth', e.target.value)}
                  placeholder="e.g. Aug / Oct"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={masterData.status}
                  onChange={(e) => handleMasterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 2: Financials & Margins */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              2. Financials & Payments
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              
              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Sales (₹) *</label>
                <input
                  type="number"
                  value={masterData.totalSales}
                  onChange={(e) => handleMasterChange('totalSales', e.target.value)}
                  placeholder="e.g. 18000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Billing Amount (Base)</label>
                <input
                  type="number"
                  value={masterData.billingAmt}
                  onChange={(e) => handleMasterChange('billingAmt', e.target.value)}
                  placeholder="e.g. 17143"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Purchase Cost (₹)</label>
                <input
                  type="number"
                  value={masterData.purchaseCost}
                  onChange={(e) => handleMasterChange('purchaseCost', e.target.value)}
                  placeholder="e.g. 15500"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-rose-600 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Profit = Billing - Purchase (₹)
                </label>
                <input
                  type="number"
                  value={masterData.profit}
                  onChange={(e) => handleMasterChange('profit', e.target.value)}
                  placeholder="e.g. 1643"
                  className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Advance Received (₹)</label>
                <input
                  type="number"
                  value={masterData.advanceReceived}
                  onChange={(e) => handleMasterChange('advanceReceived', e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">GST Amount (₹)</label>
                <input
                  type="number"
                  value={masterData.gstAmt}
                  onChange={(e) => handleMasterChange('gstAmt', e.target.value)}
                  placeholder="e.g. 857"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Due Collection Details</label>
                <input
                  type="text"
                  value={masterData.dueCollection}
                  onChange={(e) => handleMasterChange('dueCollection', e.target.value)}
                  placeholder="e.g. Guest Collection / Driver Cash"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

            </div>
          </div>

          {/* Section 3: Daywise Itinerary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-600" />
                3. Daywise Itinerary & Vehicle Allocations ({daywiseRows.length} Days)
              </h4>
              <button
                type="button"
                onClick={addDaywiseRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Day
              </button>
            </div>

            <div className="space-y-3">
              {daywiseRows.map((row, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md">
                      Day {idx + 1}
                    </span>
                    {daywiseRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDaywiseRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove Day"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    
                    {/* Daywise Date Picker */}
                    <div>
                      <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                        <span>Date</span>
                        {row.startDate && (
                          <span className="text-[10px] text-brand-600 font-semibold truncate max-w-[100px]">{row.startDate}</span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={formatToISODate(row.startDate)}
                        onChange={(e) => handleDaywiseDateChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">From</label>
                      <SmartSearchInput
                        value={row.from}
                        onChange={(val) => handleDaywiseChange(idx, 'from', val)}
                        options={dropdownOptions.fromCities}
                        placeholder="e.g. NJP"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">To</label>
                      <SmartSearchInput
                        value={row.to}
                        onChange={(val) => handleDaywiseChange(idx, 'to', val)}
                        options={dropdownOptions.toCities}
                        placeholder="e.g. Darjeeling"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Car Type</label>
                      <SmartSearchInput
                        value={row.carType}
                        onChange={(val) => handleDaywiseChange(idx, 'carType', val)}
                        options={dropdownOptions.carTypes}
                        placeholder="e.g. WagonR / Innova / Sumo"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">Assigned Vendor</label>
                      <SmartSearchInput
                        value={row.vendor}
                        onChange={(val) => handleDaywiseChange(idx, 'vendor', val)}
                        options={dropdownOptions.vendors}
                        placeholder="e.g. Samragi Homestays / Mahakal Resort"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Number of Cars</label>
                      <input
                        type="number"
                        value={row.noOfCars}
                        onChange={(e) => handleDaywiseChange(idx, 'noOfCars', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="font-bold text-slate-700 block mb-1">Itinerary / Sightseeing Plan</label>
                      <SmartSearchInput
                        value={row.itinerary}
                        onChange={(val) => handleDaywiseChange(idx, 'itinerary', val)}
                        options={dropdownOptions.itineraries}
                        placeholder="Type or select itinerary / sightseeing plan..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit Button */}
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
              {isSubmitting ? 'Saving to Google Sheet...' : 'Save & Publish Booking'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CarBookingModal;
