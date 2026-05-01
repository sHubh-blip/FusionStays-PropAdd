import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const emptyForm = {
  "Date of Entry": new Date().toISOString().split('T')[0],
  "Name of Person": "",
  "Name of property": "",
  "Location": "",
  "Phone Number": "",
  "Source": "Inbound",
  "Reason to List": "",
  "Status": "Yet to Call",
  "Live Date": "",
  "Remarks": "",
  "Details": ""
};

const InputWrapper = ({ label, error, children }) => (
  <div className="space-y-1 relative">
    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs ml-1 mt-1">{error}</p>}
  </div>
);

const SearchableSelect = ({ value, onChange, options, placeholder, allowCustom = true, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  const filtered = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } });
    setSearch(val);
    setIsOpen(false);
  };

  const handleBlur = () => {
    // Small delay to allow click on option
    setTimeout(() => {
      setIsOpen(false);
      if (!allowCustom && !options.includes(search)) {
        setSearch(value || '');
      } else if (allowCustom && search !== value) {
        onChange({ target: { name, value: search } });
      }
    }, 200);
  };

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (allowCustom) onChange(e);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        autoComplete="off"
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
      />
      {isOpen && (filtered.length > 0 || !allowCustom) && (
        <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {filtered.length > 0 ? (
            filtered.map((opt, i) => (
              <div
                key={i}
                onMouseDown={() => handleSelect(opt)}
                className="px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
              >
                {opt}
              </div>
            ))
          ) : !allowCustom && (
            <div className="px-4 py-3 text-xs text-slate-400 italic bg-slate-50/50">
              Please select an existing member or add them first via the sidebar.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RecordFormModal = ({ record, onClose, onSave, user, uniqueLocations = [], uniquePersons = [] }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to ensure date is in YYYY-MM-DD for the HTML5 input
  const formatDateForInput = (dateStr) => {
    if (!dateStr || dateStr === '-') return '';
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // If it's DD-MM-YYYY or DD-MM-YY
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return parts.join('-'); // YYYY-MM-DD
      // Assume DD-MM-YY or DD-MM-YYYY
      let [d, m, y] = parts;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  };

  useEffect(() => {
    if (record) {
      // For existing records, we MUST NOT default to today's date
      const syncedData = { ...record };
      if (syncedData['Date of Entry']) {
        syncedData['Date of Entry'] = formatDateForInput(syncedData['Date of Entry']);
      }
      if (syncedData['Live Date']) {
        syncedData['Live Date'] = formatDateForInput(syncedData['Live Date']);
      }
      setFormData({ ...emptyForm, ...syncedData });
    } else {
      let defaultPerson = '';
      if (user && user.email) {
         const parts = user.email.split('@')[0];
         defaultPerson = parts.charAt(0).toUpperCase() + parts.slice(1);
      }
      setFormData({ ...emptyForm, "Date of Entry": new Date().toISOString().split('T')[0], "Name of Person": defaultPerson });
    }
  }, [record, user]);

  const validate = () => {
    const newErrors = {};
    if (!formData['Name of Person']) newErrors['Name of Person'] = 'Required';
    if (!formData['Name of property']) newErrors['Name of property'] = 'Required';
    if (!formData['Date of Entry']) newErrors['Date of Entry'] = 'Required';
    
    // Phone validation
    if (formData['Phone Number']) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(formData['Phone Number'])) {
        newErrors['Phone Number'] = 'Must be 10-15 numeric digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // clear error for that field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {record ? 'Edit Record' : 'Add New Record'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="recordForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <InputWrapper label="Date of Entry" error={errors['Date of Entry']}>
              <input type="date" name="Date of Entry" value={formData['Date of Entry']} onChange={handleChange} 
                className={`w-full bg-slate-50 border ${errors['Date of Entry'] ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-brand-500'} rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:border-transparent transition-all`} />
            </InputWrapper>

            <InputWrapper label="Live Date" error={errors['Live Date']}>
              <input type="date" name="Live Date" value={formData['Live Date']} onChange={handleChange} 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
            </InputWrapper>

            <InputWrapper label="Name of Property" error={errors['Name of property']}>
              <input type="text" name="Name of property" value={formData['Name of property']} onChange={handleChange} 
                className={`w-full bg-slate-50 border ${errors['Name of property'] ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-brand-500'} rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:border-transparent transition-all`} />
            </InputWrapper>

            <InputWrapper label="Location" error={errors['Location']}>
               <SearchableSelect 
                 name="Location"
                 value={formData['Location']}
                 onChange={handleChange}
                 options={uniqueLocations}
                 allowCustom={true}
               />
            </InputWrapper>

            <InputWrapper label="Person (Employee Name)" error={errors['Name of Person']}>
               <SearchableSelect 
                 name="Name of Person"
                 value={formData['Name of Person']}
                 onChange={handleChange}
                 options={uniquePersons}
                 allowCustom={false}
               />
            </InputWrapper>

            <InputWrapper label="Phone Number" error={errors['Phone Number']}>
              <input type="text" name="Phone Number" value={formData['Phone Number']} onChange={handleChange} placeholder="5551234567" 
                className={`w-full bg-slate-50 border ${errors['Phone Number'] ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-brand-500'} rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:border-transparent transition-all`} />
            </InputWrapper>

            <InputWrapper label="Source" error={errors['Source']}>
              <select name="Source" value={formData['Source']} onChange={handleChange} 
               className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
                <option value="Referral">Referral</option>
                <option value="Internal Lead">Internal Lead</option>
              </select>
            </InputWrapper>

            <InputWrapper label="Status" error={errors['Status']}>
              <select name="Status" value={formData['Status']} onChange={handleChange} 
               className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                <option value="Yet to Call">Yet to Call</option>
                <option value="Called">Called</option>
                <option value="Declined">Declined</option>
                <option value="Pending for QC">Pending for QC</option>
                <option value="Follow up">Follow up</option>
                <option value="Live">Live</option>
                <option value="Called but didn't answer">Called but didn't answer</option>
                <option value="QC Reject">QC Reject</option>
                <option value="Not needed">Not needed</option>
                <option value="Full Details Received">Full Details Received</option>
                <option value="In draft">In draft</option>
                <option value="already live">already live</option>
              </select>
            </InputWrapper>

            <div className="md:col-span-2">
              <InputWrapper label="Reason to List" error={errors['Reason to List']}>
                <input type="text" name="Reason to List" value={formData['Reason to List']} onChange={handleChange} placeholder="e.g. Needs better management" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
              </InputWrapper>
            </div>

            <div className="md:col-span-2">
              <InputWrapper label="Remarks" error={errors['Remarks']}>
                <textarea name="Remarks" value={formData['Remarks']} onChange={handleChange} rows={2} placeholder="Quick notes about interaction..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none" />
              </InputWrapper>
            </div>

            <div className="md:col-span-2">
              <InputWrapper label="Comprehensive Details" error={errors['Details']}>
                <textarea name="Details" value={formData['Details']} onChange={handleChange} rows={3} placeholder="Full property specs, amenities, context..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none" />
              </InputWrapper>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
          >
            Cancel
          </button>
          
          <button 
            form="recordForm"
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-xl hover:bg-brand-700 transition-colors shadow-md hover:shadow-lg focus:outline-none flex items-center justify-center min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {record ? 'Save Changes' : 'Create Record'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default RecordFormModal;
