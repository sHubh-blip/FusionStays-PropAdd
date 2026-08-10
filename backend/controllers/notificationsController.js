const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { fetchAndMapRecords } = require('../services/sheetService');
const { initializeSheets } = require('../services/googleSheets');
const cache = require('../services/cache');

// In-memory mock leads fallback
let mockLeadsDatabase = [
  {
    _id: "mocklead1",
    "Date Added": "2026-06-01",
    "Screenshot URL": "",
    "Name of Property": "Sunset Retreat",
    "Link to Property": "https://www.airbnb.com/rooms/123456",
    "Phone Number": "+91 98765 43210",
    "Assigned To": "Shubhra",
    "Location": "Goa",
    "Status": "Pending"
  }
];

const fetchLeads = async () => {
  const doc = await initializeSheets();
  if (!doc || !doc.sheetsByTitle['Internal Leads']) {
    return mockLeadsDatabase;
  }
  const sheet = doc.sheetsByTitle['Internal Leads'];
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows({ offset: 0, limit: 5000 });
  return rows.map(r => ({
    _id: r.rowNumber.toString(),
    "Date Added": r.get('Date Added') || '',
    "Name of Property": r.get('Name of Property') || '',
    "Link to Property": r.get('Link to Property') || '',
    "Phone Number": r.get('Phone Number') || '',
    "Assigned To": r.get('Assigned To') || '',
    "Location": r.get('Location') || '',
    "Status": r.get('Status') || ''
  }));
};

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email || '';
    const userName = req.user.name || (userEmail ? userEmail.split('@')[0] : '');
    const cleanUserName = userName.trim().toLowerCase();

    // Helper to check if a record belongs to the user
    const matchesUser = (personField) => {
      if (!personField) return false;
      const target = personField.trim().toLowerCase();
      if (!target) return false;
      return target === cleanUserName || target === userEmail.toLowerCase() || target.includes(cleanUserName);
    };

    const [records, leads] = await Promise.all([
      fetchAndMapRecords().catch(() => []),
      fetchLeads().catch(() => [])
    ]);

    const safeRecords = Array.isArray(records) ? records : [];
    const safeLeads = Array.isArray(leads) ? leads : [];

    // 1. Assigned Leads notifications
    const assignedLeads = safeLeads.filter(l => matchesUser(l['Assigned To']));
    const leadNotifications = assignedLeads.map(l => ({
      id: `lead_${l._id || l['Name of Property']}`,
      type: 'assigned_lead',
      title: 'New Lead Assigned',
      message: `You have been assigned to lead: ${l['Name of Property'] || 'Unnamed Property'}`,
      property: l['Name of Property'] || 'Unnamed Property',
      location: l['Location'] || '',
      date: l['Date Added'] || '',
      link: '/leads',
      status: l['Status'] || 'Assigned'
    }));

    // 2. Property status updates for user's properties
    const userRecords = safeRecords.filter(r => matchesUser(r['Name of Person']));
    
    let liveCount = 0;
    let qcRejectCount = 0;
    const propertyNotifications = [];

    userRecords.forEach(r => {
      const st = (r['Status'] || '').trim().toLowerCase();
      const isLive = st === 'live' || st === 'already live';
      const isQcReject = st === 'qc reject' || st === 'qc rejected';

      if (isLive) liveCount++;
      if (isQcReject) qcRejectCount++;

      if (isLive || isQcReject) {
        propertyNotifications.push({
          id: `prop_${r._id || r._rowIndex || r['Name of property']}`,
          type: isLive ? 'status_live' : 'status_qc_reject',
          title: isLive ? 'Property is Live' : 'Property QC Rejected',
          message: isLive 
            ? `Property "${r['Name of property']}" is now Live!`
            : `Property "${r['Name of property']}" was marked as QC Reject.`,
          property: r['Name of property'] || 'Unnamed Property',
          location: r['Location'] || '',
          date: r['Updated Date'] || r['Live Date'] || r['Date of Entry'] || '',
          status: r['Status'] || ''
        });
      }
    });

    res.json({
      summary: {
        totalAssignedLeads: assignedLeads.length,
        liveCount,
        qcRejectCount,
        totalNotifications: leadNotifications.length + propertyNotifications.length
      },
      leadNotifications,
      propertyNotifications,
      allNotifications: [...leadNotifications, ...propertyNotifications]
    });

  } catch (error) {
    console.error('Failed to fetch notifications', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

module.exports = router;
