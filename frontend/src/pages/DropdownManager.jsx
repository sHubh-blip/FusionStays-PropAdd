// frontend/src/pages/DropdownManager.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';
import api from '../api';

const API_PATH = '/dropdowns';

const DEFAULT_PANELS = {
  agent: { label: 'Agent (Person)', values: ['AI Browser Agent', 'Barsha', 'Dhanya', 'Sanjana', 'Sarthak', 'Shubhra', 'Shubhradip', 'Zishan'] },
  location: { label: 'Location', values: ['Goa', 'North Goa', 'South Goa', 'Mumbai', 'Delhi', 'Bangalore'] },
  source: { label: 'Source', values: ['Internal Lead', 'Call', 'Referral', 'Website', 'Direct'] },
  status: { label: 'Status', values: ['Yet to Call', 'In Progress', 'Live', 'Drop', 'Closed'] }
};

// ── API helpers ──────────────────────────────────────────────
const fetchAll    = () => api.get(API_PATH).then(res => res.data);
const addValue    = ({ col, values }) =>
  api.post(`${API_PATH}/${col}/add`, { values }).then(res => res.data);

const deleteValue = ({ col, values }) =>
  api.delete(`${API_PATH}/${col}/delete`, { data: { values } }).then(res => res.data);

const renameValue = ({ col, oldValue, newValue }) =>
  api.patch(`${API_PATH}/${col}/rename`, { oldValue, newValue }).then(res => res.data);

// ── Single Column Panel ──────────────────────────────────────
function DropdownPanel({ columnKey, label, values = [], allRecords = [] }) {
  const [newEntry, setNewEntry] = useState('');
  const [renaming, setRenaming] = useState(null); // { old, new }
  const qc = useQueryClient();

  const FIELD_MAP = {
    agent: 'Name of Person',
    location: 'Location',
    source: 'Source',
    status: 'Status'
  };

  const getCount = (val) => {
    const field = FIELD_MAP[columnKey];
    if (!field) return 0;
    return allRecords.filter(r => (r[field] || '').toLowerCase().trim() === val.toLowerCase().trim()).length;
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dropdowns'] });

  const addMut = useMutation({
    mutationFn: addValue,
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: deleteValue,
    onSuccess: invalidate,
  });
  const renameMut = useMutation({
    mutationFn: renameValue,
    onSuccess: () => { setRenaming(null); invalidate(); },
  });

  const handleAdd = () => {
    const trimmed = newEntry.trim();
    if (!trimmed) return;
    if (values.some(v => v.toLowerCase().trim() === trimmed.toLowerCase())) {
      alert(`${label} already exists`);
      return;
    }
    addMut.mutate({ col: columnKey, values: trimmed });
    setNewEntry('');
  };

  const handleDelete = (val) => {
    if (!window.confirm(`Remove "${val}" from ${label}?`)) return;
    delMut.mutate({ col: columnKey, values: val });
  };

  const handleRename = (val) => setRenaming({ old: val, new: val });

  const submitRename = () => {
    if (!renaming.new.trim() || renaming.new === renaming.old) {
      setRenaming(null);
      return;
    }
    renameMut.mutate({
      col: columnKey,
      oldValue: renaming.old,
      newValue: renaming.new.trim(),
    });
  };

  const isLoading = addMut.isPending || delMut.isPending || renameMut.isPending;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-base">{label}</h3>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {values.length} options
          </span>
        </div>

        {/* Add new value */}
        <div className="flex items-center gap-2 mb-4 w-full">
          <input
            type="text"
            value={newEntry}
            onChange={e => setNewEntry(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={`Add new ${label.toLowerCase()}...`}
            disabled={isLoading}
            className="flex-1 min-w-0 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!newEntry.trim() || isLoading}
            className="flex-shrink-0 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl px-3 py-2 text-xs transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Current values list */}
        <ul className="space-y-1.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
          {values.map(val => (
            <li key={val} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group">
              {renaming?.old === val ? (
                // Inline rename input
                <div className="flex items-center gap-2 flex-1">
                  <input
                    className="flex-1 bg-white border border-brand-500 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
                    value={renaming.new}
                    onChange={e => setRenaming(r => ({ ...r, new: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitRename();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    autoFocus
                  />
                  <button onClick={submitRename} disabled={isLoading} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-md">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRenaming(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-md">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // Normal display
                <>
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <span className="text-xs font-semibold text-slate-700 truncate">{val}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      {getCount(val)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRename(val)}
                      className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(val)}
                      disabled={isLoading}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {values.length === 0 && (
            <li className="text-center py-6 text-xs text-slate-400 italic">No options yet. Add one above.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function DropdownManager() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dropdowns'],
    queryFn: fetchAll,
    staleTime: 30_000,
  });

  // Fetch all records to calculate counts
  const { data: allRecords = [] } = useQuery({
    queryKey: ['all_records_for_counts'],
    queryFn: () => api.get('/records?paginate=false').then(res => res.data?.data || []),
    staleTime: 30_000,
  });

  // Fetch active users list
  const { data: usersListData = [] } = useQuery({
    queryKey: ['usersList'],
    queryFn: () => api.get('/users/list').then(res => res.data || []),
    staleTime: 30_000,
  });

  const apiDropdowns = data?.dropdowns || {};

  const FIELD_MAP = {
    agent: 'Name of Person',
    location: 'Location',
    source: 'Source',
    status: 'Status'
  };

  const getMergedValues = (key) => {
    const apiVals = apiDropdowns[key]?.values || [];
    const fieldName = FIELD_MAP[key];
    const recordVals = fieldName ? allRecords.map(r => r[fieldName]).filter(Boolean) : [];
    const defaultVals = DEFAULT_PANELS[key]?.values || [];
    let userVals = [];
    if (key === 'agent') {
      userVals = usersListData.map(u => u.name || (u.email ? u.email.split('@')[0] : '')).filter(Boolean).map(n => n.charAt(0).toUpperCase() + n.slice(1));
    }

    const set = new Set([...apiVals, ...recordVals, ...userVals, ...defaultVals]);
    return Array.from(set)
      .filter(v => v.toLowerCase() !== key.toLowerCase() && v.toLowerCase() !== 'name of person')
      .sort();
  };

  const mergedPanels = {
    agent: {
      label: 'Agent (Person)',
      values: getMergedValues('agent')
    },
    location: {
      label: 'Location',
      values: getMergedValues('location')
    },
    source: {
      label: 'Source',
      values: getMergedValues('source')
    },
    status: {
      label: 'Status',
      values: getMergedValues('status')
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="mr-4 p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dropdown Manager</h1>
            <p className="text-slate-500 text-xs mt-1">
              Add, remove, or rename options for any dropdown column. Changes sync to Google Sheets instantly.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-2" />
            <p className="text-slate-500 text-xs font-semibold">Loading dropdown options...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(mergedPanels).map(([key, { label, values }]) => (
              <DropdownPanel
                key={key}
                columnKey={key}
                label={label}
                values={values || []}
                allRecords={allRecords}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
