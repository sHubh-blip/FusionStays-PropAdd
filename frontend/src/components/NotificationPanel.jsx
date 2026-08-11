import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, CheckCircle, AlertTriangle, UserCheck, Layers,
  ChevronRight, Sparkles, CheckCheck
} from 'lucide-react';

const NotificationPanel = ({ isOpen, onClose, notificationsData, onMarkAllRead, readIds = new Set() }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all'); // all, leads, status

  if (!isOpen) return null;

  const isAdmin = notificationsData?.isAdmin;
  const summary = notificationsData?.summary || {};
  const leadList = notificationsData?.leadNotifications || [];
  const propList = notificationsData?.propertyNotifications || [];
  const allList = notificationsData?.allNotifications || [];

  const displayList = activeTab === 'leads'
    ? leadList
    : activeTab === 'status'
    ? propList
    : allList;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight text-white">Notifications</h2>
              <p className="text-[11px] text-slate-300">
                {isAdmin ? 'Pending QC properties & unassigned leads' : 'Your assigned leads & property status changes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/70 border-b border-slate-200/70">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {isAdmin ? 'Admin Action Overview' : 'Activity Overview'}
          </div>

          {isAdmin ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs text-center">
                <div className="text-xl font-black text-amber-600">{summary.pendingQcCount || 0}</div>
                <div className="text-[11px] font-bold text-amber-800">Pending for QC</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-rose-200/80 shadow-2xs text-center">
                <div className="text-xl font-black text-rose-600">{summary.unassignedLeadsCount || 0}</div>
                <div className="text-[11px] font-bold text-rose-800">Unassigned Leads</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs text-center">
                <div className="text-lg font-black text-amber-600">{summary.totalAssignedLeads || 0}</div>
                <div className="text-[10px] font-semibold text-slate-500">Leads Assigned</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs text-center">
                <div className="text-lg font-black text-emerald-600">{summary.liveCount || 0}</div>
                <div className="text-[10px] font-semibold text-emerald-700">Made Live</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-rose-200/80 shadow-2xs text-center">
                <div className="text-lg font-black text-rose-600">{summary.qcRejectCount || 0}</div>
                <div className="text-[10px] font-semibold text-rose-700">QC Rejected</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              All ({allList.length})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'leads' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {isAdmin ? 'Unassigned Leads' : 'Leads'} ({leadList.length})
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'status' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {isAdmin ? 'Pending QC' : 'Status Updates'} ({propList.length})
            </button>
          </div>

          <button
            onClick={onMarkAllRead}
            className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1"
            title="Mark all as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark read
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
          {displayList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-slate-300" />
              </div>
              <p className="font-semibold text-sm text-slate-600">No Notifications</p>
              <p className="text-xs text-slate-400 mt-1">Assignments and property updates will show up here.</p>
            </div>
          ) : (
            displayList.map((item) => {
              const isRead = readIds.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.link) {
                      navigate(item.link);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isRead
                      ? 'bg-white border-slate-200 opacity-75'
                      : item.type === 'assigned_lead'
                      ? 'bg-amber-50/70 border-amber-200/80 hover:border-amber-300 shadow-2xs'
                      : item.type === 'status_live'
                      ? 'bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-300 shadow-2xs'
                      : 'bg-rose-50/70 border-rose-200/80 hover:border-rose-300 shadow-2xs'
                  }`}
                >
                  {!isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'assigned_lead'
                        ? 'bg-amber-100 text-amber-700'
                        : item.type === 'status_live'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {item.type === 'assigned_lead' && <UserCheck className="w-4 h-4" />}
                      {item.type === 'status_live' && <CheckCircle className="w-4 h-4" />}
                      {item.type === 'status_qc_reject' && <AlertTriangle className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">{item.title}</span>
                        {item.date && <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>}
                      </div>

                      <p className="text-xs text-slate-600 font-medium mt-0.5 leading-snug">{item.message}</p>

                      <div className="flex items-center gap-2 mt-2">
                        {item.location && (
                          <span className="text-[10px] font-semibold bg-white/80 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                            📍 {item.location}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.type === 'assigned_lead'
                            ? 'bg-amber-100 text-amber-800'
                            : item.type === 'status_live'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default NotificationPanel;
