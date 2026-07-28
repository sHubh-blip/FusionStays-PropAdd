import React, { memo } from 'react';
import { MoreVertical, Edit2, MapPin } from 'lucide-react';
import { getTodayIST, normalizeDate } from '../utils/dateUtils';

const statusColors = {
  'Yet to Call': 'bg-[#fbe9e7] text-[#d84315] border-[#ffccbc]',
  'Called': 'bg-[#e0f7fa] text-[#006064] border-[#b2ebf2]',
  'Declined': 'bg-[#ffebee] text-[#c62828] border-[#ffcdd2]',
  'Pending for QC': 'bg-[#f3e5f5] text-[#6a1b9a] border-[#e1bee7]',
  'Follow up': 'bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]',
  'Live': 'bg-[#1b5e20] text-white border-transparent',
  "Called but didn't answer": 'bg-[#424242] text-white border-transparent',
  'QC Reject': 'bg-[#f5f5f5] text-[#616161] border-[#e0e0e0]',
  'Not needed': 'bg-[#0d47a1] text-white border-transparent',
  'Full Details Received': 'bg-[#6200ea] text-white border-transparent',
  'In draft': 'bg-[#f50057] text-white border-transparent',
  'already live': 'bg-[#e0f2f1] text-[#004d40] border-[#b2dfdb]',
};

const allStatuses = [
  'Yet to Call',
  'Called',
  'Declined',
  'Pending for QC',
  'Follow up',
  'Live',
  "Called but didn't answer",
  'QC Reject',
  'Not needed',
  'Full Details Received',
  'In draft',
  'already live'
];

const RecordTable = ({ 
  records, 
  onEdit, 
  onStatusChange, 
  onPersonChange, 
  uniquePersons = [],
  locationFilter = '',
  setLocationFilter,
  statusFilter = '',
  setStatusFilter,
  personFilter = '',
  setPersonFilter,
  uniqueLocations = [],
  dateFilter = 'all',
  setDateFilter,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate
}) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full table-fixed text-left border-collapse">
        <thead>
          <tr className="bg-slate-400/70 border-b border-slate-400 text-slate-900 text-[11px] uppercase tracking-wider font-bold">
            <th className="py-2.5 px-4 w-[21%]">
              <div className="flex items-center justify-between">
                <span>Property / Person</span>
                {setPersonFilter && (
                  <select
                    value={personFilter}
                    onChange={(e) => setPersonFilter(e.target.value)}
                    className="bg-slate-100 hover:bg-white text-slate-800 text-[10px] lowercase capitalize font-semibold border border-slate-300 rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="">Filter Agent</option>
                    {uniquePersons.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>
            </th>

            <th className="py-2.5 px-4 w-[15%]">
              <div className="flex items-center justify-between">
                <span>Location</span>
                {setLocationFilter && (
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="bg-slate-100 hover:bg-white text-slate-800 text-[10px] font-semibold border border-slate-300 rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="">All</option>
                    {uniqueLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              </div>
            </th>

            <th className="py-2.5 px-4 w-[18%]">Contact</th>

            <th className="py-2.5 px-4 w-[16%]">
              <div className="flex items-center justify-between">
                <span>Status</span>
                {setStatusFilter && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-100 hover:bg-white text-slate-800 text-[10px] font-semibold border border-slate-300 rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value="">All</option>
                    {allStatuses.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            </th>

            <th className="py-2.5 px-4 w-[21%]">
              <div className="flex items-center justify-between gap-1">
                <span>Dates</span>
                {setDateFilter && (
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      if (e.target.value !== 'custom') {
                        setStartDate && setStartDate('');
                        setEndDate && setEndDate('');
                      }
                    }}
                    className="bg-slate-100 hover:bg-white text-slate-800 text-[10px] font-semibold border border-slate-300 rounded px-1 py-0.5 focus:outline-none cursor-pointer uppercase tracking-tight"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Range / Single</option>
                  </select>
                )}
              </div>
              {(dateFilter === 'custom' || startDate || endDate) && setStartDate && (
                <div className="flex items-center gap-1 mt-1 font-normal lowercase">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateFilter && setDateFilter('custom');
                    }}
                    title="Start Date / Single Date"
                    className="bg-white text-slate-800 text-[10px] border border-slate-300 rounded px-1 py-0.5 w-[85px] focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-500 font-bold">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateFilter && setDateFilter('custom');
                    }}
                    title="End Date"
                    className="bg-white text-slate-800 text-[10px] border border-slate-300 rounded px-1 py-0.5 w-[85px] focus:outline-none"
                  />
                </div>
              )}
            </th>
            <th className="py-2.5 px-4 w-[9%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300 bg-slate-200/90 text-slate-900">
          {records.map((record, idx) => {
            const statusColor = statusColors[record['Status']] || 'bg-slate-100 text-slate-700 border-slate-200';
            const isLive = (record['Status'] || '').trim().toLowerCase() === 'live';
            const liveNormalized = normalizeDate(record['Live Date']);
            const isLiveToday = isLive && liveNormalized === getTodayIST();
            
            return (
              <tr key={record._id || record._rowIndex || idx} className={`transition-colors group ${isLiveToday ? 'bg-emerald-100/90 hover:bg-emerald-200/90 border-l-4 border-emerald-600' : 'hover:bg-slate-300/80'}`}>
                <td className="py-1.5 px-4 align-top">
                  <div className="flex flex-col items-start leading-tight">
                    <span className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors break-words whitespace-normal text-sm">
                      {record['Name of property'] || 'Unnamed Property'}
                    </span>
                    <div className="relative inline-block mt-1 text-[10px]">
                      <select 
                        value={record['Name of Person'] || ''}
                        onChange={(e) => onPersonChange && onPersonChange(record, e.target.value)}
                        className={`appearance-none bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-1.5 py-0.5 pr-5 rounded border border-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer transition-colors font-semibold`}
                      >
                        <option value="" disabled>Agent</option>
                        {uniquePersons.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5">
                        <svg className="h-3 w-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="py-1.5 px-4 align-top whitespace-normal">
                  <div className="flex items-center text-slate-600">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <span className="text-sm">{record['Location'] || '-'}</span>
                  </div>
                </td>
                
                <td className="py-1.5 px-4 align-top whitespace-normal">
                  <div className="flex flex-col text-sm">
                    <span className="text-slate-700">{record['Phone Number'] || '-'}</span>
                    <span className="text-slate-400 text-xs mt-0.5">{record['Source'] || '-'}</span>
                  </div>
                </td>
                
                <td className="py-1.5 px-4 align-top">
                  <div className="relative inline-block w-full max-w-[170px]">
                    <select 
                      value={record['Status'] || 'Yet to Call'}
                      onChange={(e) => onStatusChange && onStatusChange(record, e.target.value)}
                      className={`appearance-none w-full px-3 py-1.5 rounded-full text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-sm ${statusColor}`}
                    >
                      {allStatuses.map(s => (
                        <option key={s} value={s} className="bg-white text-slate-900">{s}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                       <svg className={`h-4 w-4 ${statusColor?.includes('text-white') ? 'text-white' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                       </svg>
                    </div>
                  </div>
                </td>
                
                <td className="py-1.5 px-4 text-[11px] text-slate-500 align-top">
                  <div className="flex flex-col">
                    <span><span className="text-slate-400 text-xs">Added:</span> {record['Date of Entry'] || '-'}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-slate-400 text-xs">Live:</span> 
                      <span className={isLiveToday ? 'font-bold text-emerald-700' : ''}>{record['Live Date'] || '-'}</span>
                      {isLiveToday && (
                        <span className="px-1 py-0.2 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          TODAY
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                
                <td className="py-1.5 px-4 text-right">
                  <button 
                    onClick={() => onEdit(record)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors inline-flex focus:outline-none"
                    title="Edit Record"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default memo(RecordTable);
