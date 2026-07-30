import React, { useState, useEffect, useContext, useMemo } from 'react';
import { X, Copy, Check, Calendar, User, FileText, Loader2, RefreshCw } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { getEODWorkDateIST, formatEODHeaderDate, normalizeDate } from '../utils/dateUtils';
import api from '../api';

const EODGeneratorModal = ({ onClose }) => {
  const { user } = useContext(AuthContext);

  const [records, setRecords] = useState([]);
  const [leads, setLeads] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [copied, setCopied] = useState(false);

  const currentEODDate = useMemo(() => getEODWorkDateIST(), []);
  const headerDateStr = useMemo(() => formatEODHeaderDate(currentEODDate), [currentEODDate]);
  const currentMonthPrefix = useMemo(() => currentEODDate.slice(0, 7), [currentEODDate]); // YYYY-MM

  // Fetch records, leads, and users list
  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, leadsRes, usersRes] = await Promise.all([
        api.get(`/records?paginate=false&_t=${Date.now()}`).catch(() => ({ data: [] })),
        api.get(`/leads?_t=${Date.now()}`).catch(() => ({ data: [] })),
        api.get('/users/list').catch(() => ({ data: [] }))
      ]);

      const recData = Array.isArray(recordsRes.data?.data)
        ? recordsRes.data.data
        : (Array.isArray(recordsRes.data) ? recordsRes.data : []);

      const leadData = Array.isArray(leadsRes.data) ? leadsRes.data : [];
      const userArray = Array.isArray(usersRes.data) ? usersRes.data : [];

      setRecords(recData);
      setLeads(leadData);
      setUsersList(userArray);

      // Default selected user to logged in user
      const defaultName = user?.name || (user?.email ? user.email.split('@')[0] : '');
      setSelectedUser(defaultName);
    } catch (err) {
      console.error('Failed to fetch data for EOD Report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute list of available employees/persons for filter dropdown
  const personOptions = useMemo(() => {
    const fromUsers = usersList.map(u => u.name || (u.email ? u.email.split('@')[0] : '')).filter(Boolean);
    const fromRecords = records.map(r => r["Name of Person"]).filter(Boolean);
    const fromLeads = leads.map(l => l["Assigned To"]).filter(Boolean);
    const merged = [...new Set([...fromUsers, ...fromRecords, ...fromLeads])].filter(
      n => n.toLowerCase() !== 'unassigned' && n.toLowerCase() !== 'agent'
    ).sort();
    return merged;
  }, [usersList, records, leads]);

  // Compute metrics for selectedUser
  const eodReportData = useMemo(() => {
    if (!selectedUser) {
      return { shortlisted: { today: 0, mtd: 0 }, called: { today: 0, mtd: 0 }, agreed: { today: 0, mtd: 0 }, shared: { today: 0, mtd: 0 }, uploaded: { today: 0, mtd: 0 }, live: { today: 0, mtd: 0 } };
    }

    const selClean = selectedUser.trim().toLowerCase();
    const selPrefix = selectedUser.includes('@') ? selectedUser.split('@')[0].trim().toLowerCase() : selClean;

    const matchesUser = (personVal) => {
      if (!personVal) return false;
      const clean = personVal.trim().toLowerCase();
      if (clean === selClean || clean === selPrefix) return true;
      if (clean.includes(selClean) || selClean.includes(clean)) return true;
      if (clean.includes(selPrefix) || selPrefix.includes(clean)) return true;
      return false;
    };

    // Filter user records and leads
    const userRecords = records.filter(r => matchesUser(r["Name of Person"]));
    const userLeads = leads.filter(l => matchesUser(l["Assigned To"]));

    let shortlistedToday = 0, shortlistedMtd = 0;
    let calledToday = 0, calledMtd = 0;
    let agreedToday = 0, agreedMtd = 0;
    let sharedToday = 0, sharedMtd = 0;
    let uploadedToday = 0, uploadedMtd = 0;
    let liveToday = 0, liveMtd = 0;

    // Process Database Records
    userRecords.forEach(r => {
      const entryDate = normalizeDate(r["Date of Entry"]);
      const liveDate = normalizeDate(r["Live Date"]);
      const status = (r["Status"] || '').trim().toLowerCase();

      const isTodayEntry = !entryDate || entryDate === currentEODDate;
      const isMtdEntry = !entryDate || (entryDate && entryDate.startsWith(currentMonthPrefix));

      const isStrictTodayEntry = entryDate === currentEODDate;
      const isStrictMtdEntry = entryDate && entryDate.startsWith(currentMonthPrefix);

      const isTodayLive = (liveDate === currentEODDate) || (isStrictTodayEntry && (status.includes('live')));
      const isMtdLive = (liveDate && liveDate.startsWith(currentMonthPrefix)) || (isStrictMtdEntry && (status.includes('live')));

      // 1. Shortlisted: Total properties added by this user (all records added today / in month)
      if (isStrictTodayEntry) shortlistedToday++;
      if (isStrictMtdEntry) shortlistedMtd++;

      // 2. Connected / Called: Status is Called
      if (status.includes('called') || status.includes('call')) {
        if (isStrictTodayEntry) calledToday++;
        if (isStrictMtdEntry) calledMtd++;
      }

      // 3. Agreed to Partner: Status is contact++ or contact later
      if (status.includes('contact++') || status.includes('contact later') || status.includes('contacted') || status.includes('agreed')) {
        if (isStrictTodayEntry) agreedToday++;
        if (isStrictMtdEntry) agreedMtd++;
      }

      // 4. Shared all details: Status is Full Details Received ONLY
      if (status.includes('full details received') || status.includes('full details')) {
        if (isStrictTodayEntry) sharedToday++;
        if (isStrictMtdEntry) sharedMtd++;
      }

      // 5. Uploaded: Status is Pending for QC (robust check for pending for qc, qc pending, pending_qc, etc.)
      const isPendingQC = status.includes('pending for qc') || 
                          status.includes('pending qc') || 
                          status.includes('qc pending') || 
                          (status.includes('pending') && status.includes('qc'));
                          
      if (isPendingQC) {
        if (isTodayEntry) uploadedToday++;
        if (isMtdEntry) uploadedMtd++;
      }

      // 6. Live: Status is Live / Already Live
      if (status.includes('live')) {
        if (isTodayLive) liveToday++;
        if (isMtdLive) liveMtd++;
      }
    });

    // Process Internal Leads
    userLeads.forEach(l => {
      const addedDate = normalizeDate(l["Date Added"]);
      const status = (l["Status"] || '').trim().toLowerCase();

      const isTodayAdded = !addedDate || addedDate === currentEODDate;
      const isMtdAdded = !addedDate || (addedDate && addedDate.startsWith(currentMonthPrefix));

      const isStrictTodayAdded = addedDate === currentEODDate;
      const isStrictMtdAdded = addedDate && addedDate.startsWith(currentMonthPrefix);

      // Shortlisted (total added leads)
      if (isStrictTodayAdded) shortlistedToday++;
      if (isStrictMtdAdded) shortlistedMtd++;

      // Connected / Called
      if (status.includes('contacted') || status.includes('in progress') || status.includes('called')) {
        if (isStrictTodayAdded) calledToday++;
        if (isStrictMtdAdded) calledMtd++;
      }

      // Agreed for leads (contact++ or contact later)
      if (status.includes('contact++') || status.includes('contact later') || status.includes('contacted')) {
        if (isStrictTodayAdded) agreedToday++;
        if (isStrictMtdAdded) agreedMtd++;
      }

      // Uploaded for leads (pending for qc or added)
      const isLeadPendingQC = status.includes('pending for qc') || 
                              status.includes('pending qc') || 
                              (status.includes('pending') && status.includes('qc')) ||
                              status.includes('added');

      if (isLeadPendingQC) {
        if (isTodayAdded) uploadedToday++;
        if (isMtdAdded) uploadedMtd++;
      }
    });

    return {
      shortlisted: { today: shortlistedToday, mtd: shortlistedMtd },
      called: { today: calledToday, mtd: calledMtd },
      agreed: { today: agreedToday, mtd: agreedMtd },
      shared: { today: sharedToday, mtd: sharedMtd },
      uploaded: { today: uploadedToday, mtd: uploadedMtd },
      live: { today: liveToday, mtd: liveMtd }
    };
  }, [selectedUser, records, leads, currentEODDate, currentMonthPrefix]);

  // Copy EOD report as text/formatted spreadsheet
  const handleCopyReport = () => {
    const textReport = `EOD REPORT ${headerDateStr} (${selectedUser})\n` +
      `-----------------------------------------------\n` +
      `METRIC                               | TODAY | MTD\n` +
      `-----------------------------------------------\n` +
      `count of properties shortlisted       | ${eodReportData.shortlisted.today.toString().padStart(5)} | ${eodReportData.shortlisted.mtd.toString().padStart(5)}\n` +
      `count of properties connected/called  | ${eodReportData.called.today.toString().padStart(5)} | ${eodReportData.called.mtd.toString().padStart(5)}\n` +
      `count of properties agreed to partner | ${eodReportData.agreed.today.toString().padStart(5)} | ${eodReportData.agreed.mtd.toString().padStart(5)}\n` +
      `count of properties shared all details| ${eodReportData.shared.today.toString().padStart(5)} | ${eodReportData.shared.mtd.toString().padStart(5)}\n` +
      `count of properties uploaded          | ${eodReportData.uploaded.today.toString().padStart(5)} | ${eodReportData.uploaded.mtd.toString().padStart(5)}\n` +
      `count of properties live              | ${eodReportData.live.today.toString().padStart(5)} | ${eodReportData.live.mtd.toString().padStart(5)}\n` +
      `-----------------------------------------------`;

    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-scale-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">EOD Report Generator</h3>
              <p className="text-[11px] text-slate-400 font-medium">Daily work summary (Resets daily at 6:00 AM IST)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Controls: Employee Selection & Reset Notice */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex-shrink-0">Employee:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all flex-1"
              >
                {personOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Work Date: {headerDateStr}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Generating EOD report metrics...</p>
            </div>
          ) : (
            /* Excel-Style Table Representation */
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
              
              {/* Green Title Header */}
              <div className="bg-[#4d9346] text-white font-extrabold px-4 py-2 text-sm tracking-wide border-b border-slate-400 flex justify-between items-center">
                <span>EOD REPORT {headerDateStr}</span>
                <span className="text-xs font-normal text-emerald-100">User: {selectedUser}</span>
              </div>

              {/* Grid Table */}
              <table className="w-full text-left border-collapse bg-white text-xs">
                <thead>
                  <tr className="bg-[#5b9bd5] text-white font-bold uppercase border-b border-slate-300">
                    <th className="py-2.5 px-4 w-[60%] border-r border-slate-300">METRIC</th>
                    <th className="py-2.5 px-4 w-[20%] text-center border-r border-slate-300">TODAY</th>
                    <th className="py-2.5 px-4 w-[20%] text-center">MTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 border-r border-slate-200">count of properties shortlisted</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900 border-r border-slate-200">{eodReportData.shortlisted.today}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{eodReportData.shortlisted.mtd}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                    <td className="py-2.5 px-4 border-r border-slate-200">count of properties connected/called</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900 border-r border-slate-200">{eodReportData.called.today}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{eodReportData.called.mtd}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 border-r border-slate-200">count of properties who agreed to partner with us</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900 border-r border-slate-200">{eodReportData.agreed.today}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{eodReportData.agreed.mtd}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                    <td className="py-2.5 px-4 border-r border-slate-200">count of properties who has shared all details with us</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900 border-r border-slate-200">{eodReportData.shared.today}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{eodReportData.shared.mtd}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 border-r border-slate-200">count of properties uploaded</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900 border-r border-slate-200">{eodReportData.uploaded.today}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{eodReportData.uploaded.mtd}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                    <td className="py-2.5 px-4 border-r border-slate-200">count of properties live</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900 border-r border-slate-200">{eodReportData.live.today}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-900">{eodReportData.live.mtd}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh EOD Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Close
            </button>
            <button
              onClick={handleCopyReport}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy EOD Report'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EODGeneratorModal;
