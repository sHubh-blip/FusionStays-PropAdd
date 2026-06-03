// frontend/src/pages/DropdownManager.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api from '../api';

const API_PATH = '/dropdowns';

// ── API helpers ──────────────────────────────────────────────
const fetchAll    = () => api.get(API_PATH).then(res => res.data);
const addValue    = ({ col, values }) =>
  api.post(`${API_PATH}/${col}/add`, { values }).then(res => res.data);

const deleteValue = ({ col, values }) =>
  api.delete(`${API_PATH}/${col}/delete`, { data: { values } }).then(res => res.data);

const renameValue = ({ col, oldValue, newValue }) =>
  api.patch(`${API_PATH}/${col}/rename`, { oldValue, newValue }).then(res => res.data);

// ── Single Column Panel ──────────────────────────────────────
function DropdownPanel({ columnKey, label, values, allRecords }) {
  const [newEntry, setNewEntry]   = useState('');
  const [renaming, setRenaming]   = useState(null); // { old, new }
  const qc = useQueryClient();

  // Mapping for counting logic
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
    <div className="dropdown-panel">
      <h3>{label}</h3>
      <p className="count">{values.length} options</p>

      {/* Add new value */}
      <div className="add-row">
        <input
          value={newEntry}
          onChange={e => setNewEntry(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Add new ${label.toLowerCase()}...`}
          disabled={isLoading}
        />
        <button onClick={handleAdd} disabled={!newEntry.trim() || isLoading}>
          + Add
        </button>
      </div>

      {/* Current values list */}
      <ul className="values-list">
        {values.map(val => (
          <li key={val} className="value-item">
            {renaming?.old === val ? (
              // Inline rename input
              <div className="rename-container">
                <input
                  className="rename-input"
                  value={renaming.new}
                  onChange={e => setRenaming(r => ({ ...r, new: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  autoFocus
                />
                <div className="rename-actions">
                  <button onClick={submitRename} disabled={isLoading} className="btn-save">✓</button>
                  <button onClick={() => setRenaming(null)} className="btn-cancel">✕</button>
                </div>
              </div>
            ) : (
              // Normal display
              <>
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <span className="value-label truncate">{val}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    {getCount(val)}
                  </span>
                </div>
                <div className="value-actions">
                  <button
                    className="btn-rename"
                    onClick={() => handleRename(val)}
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(val)}
                    title="Delete"
                    disabled={isLoading}
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {values.length === 0 && (
          <li className="empty">No options yet. Add one above.</li>
        )}
      </ul>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function DropdownManager() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dropdowns'],
    queryFn: fetchAll,
    staleTime: 60_000,
  });

  // Fetch all records to calculate counts
  const { data: allRecords = [] } = useQuery({
    queryKey: ['all_records_for_counts'],
    queryFn: () => api.get('/records?paginate=false').then(res => res.data.data || []),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dropdown settings...</div>;
  if (isError)   return <div className="p-8 text-center text-red-500">Failed to load. Please refresh.</div>;

  const dropdowns = data?.dropdowns || {};

  return (
    <div className="dropdown-manager-page">
      <div className="page-header">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="mr-4 p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2>Dropdown Manager</h2>
        </div>
        <p>
          Add, remove, or rename options for any dropdown column.
          Changes sync to Google Sheets instantly.
        </p>
      </div>

      <div className="panels-grid">
        {Object.entries(dropdowns).map(([key, { label, values }]) => (
          <DropdownPanel
            key={key}
            columnKey={key}
            label={label}
            values={values || []}
            allRecords={allRecords}
          />
        ))}
      </div>
    </div>
  );
}
