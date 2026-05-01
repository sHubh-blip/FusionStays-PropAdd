import React, { memo } from 'react';
import { MoreVertical, Edit2, MapPin } from 'lucide-react';

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

const RecordTable = ({ records, onEdit, onStatusChange, onPersonChange, uniquePersons = [] }) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full table-fixed text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
            <th className="py-2 px-4 w-[22%]">Property / Person</th>
            <th className="py-2 px-4 w-[14%]">Location</th>
            <th className="py-2 px-4 w-[22%]">Contact</th>
            <th className="py-2 px-4 w-[15%]">Status</th>
            <th className="py-2 px-4 w-[18%]">Dates</th>
            <th className="py-2 px-4 w-[9%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record, idx) => {
            const statusColor = statusColors[record['Status']] || 'bg-slate-100 text-slate-700 border-slate-200';
            
            return (
              <tr key={record._id || record._rowIndex || idx} className="hover:bg-slate-50/80 transition-colors group">
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
                    <span><span className="text-slate-400 text-xs">Live:</span> {record['Live Date'] || '-'}</span>
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
