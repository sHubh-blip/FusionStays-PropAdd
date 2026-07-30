const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requireAuth = require('../middleware/auth');
const { initializeSheets } = require('../services/googleSheets');
const cache = require('../services/cache');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config
const storage = multer.diskStorage({
  targetField: uploadsDir,
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

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

// Helper to get raw data
const fetchLeadsSheet = async () => {
  const cachedLeads = cache.get('all_leads');

  const doc = await initializeSheets();
  if (!doc) return { mock: true, rows: mockLeadsDatabase, sheet: null };
  
  // Try to find sheet by title 'Internal Leads'
  if (!doc.sheetsByTitle['Internal Leads']) {
    try {
      await doc.loadInfo();
    } catch (e) {
      console.warn("loadInfo failed:", e.message);
    }
  }

  let sheet = doc.sheetsByTitle['Internal Leads'];
  
  // Create if it doesn't exist
  if (!sheet) {
    console.log("Creating 'Internal Leads' worksheet in Google Sheet...");
    try {
      sheet = await doc.addSheet({
        title: 'Internal Leads',
        headerValues: ['Date Added', 'Screenshot URL', 'Name of Property', 'Link to Property', 'Phone Number', 'Assigned To', 'Location', 'Status']
      });
    } catch (e) {
      console.warn("Could not create 'Internal Leads' worksheet, refreshing sheet info:", e.message);
      try {
        await doc.loadInfo();
        sheet = doc.sheetsByTitle['Internal Leads'];
      } catch (err) {
        console.error("Failed to load sheet 'Internal Leads':", err.message);
      }
    }
  }

  if (!sheet) {
      console.warn("Internal Leads sheet not found. Falling back to mock.");
      return { mock: true, rows: mockLeadsDatabase, sheet: null };
  }

  if (cachedLeads) {
    return { mock: false, rows: cachedLeads, sheet };
  }

  // Ensure all required headers exist
  try {
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    const required = ['Date Added', 'Screenshot URL', 'Name of Property', 'Link to Property', 'Phone Number', 'Assigned To', 'Location', 'Status'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
      console.log("Upgrading header values for 'Internal Leads' sheet...", missing);
      await sheet.setHeaderRow([...headers, ...missing]);
    }
  } catch (err) {
    console.warn("Failed to verify/upgrade headers:", err.message);
  }

  const rows = await sheet.getRows();
  
  const rowData = rows.map((row) => {
    return {
      _rowIndex: row.rowNumber,
      "Date Added": row.get('Date Added') || '',
      "Screenshot URL": row.get('Screenshot URL') || '',
      "Name of Property": row.get('Name of Property') || '',
      "Link to Property": row.get('Link to Property') || '',
      "Phone Number": row.get('Phone Number') || '',
      "Assigned To": row.get('Assigned To') || '',
      "Location": row.get('Location') || '',
      "Status": row.get('Status') || '',
    };
  });
  
  // Sort descending by rowIndex/id so newest is first
  rowData.sort((a, b) => b._rowIndex - a._rowIndex);
  cache.set('all_leads', rowData, 120); // Cache leads for 2 minutes
  
  return { mock: false, rows: rowData, sheet };
};

// GET all leads
router.get('/leads', requireAuth, async (req, res) => {
  try {
    const data = await fetchLeadsSheet();
    let rows = data.mock ? [...data.rows].reverse() : data.rows;

    const userRole = (req.user?.role || '').toLowerCase();
    // admin, team_member, prop_add, prop/add, pa: full access to internal leads
    const isFullAccessRole = ['admin', 'team_member', 'prop_add', 'prop/add', 'pa', 'property_adder'].includes(userRole);

    if (!isFullAccessRole) {
      const userEmail = (req.user?.email || '').toLowerCase();
      const userUsername = userEmail.split('@')[0];
      const isAssignee = (assignedToVal) => {
        if (!assignedToVal) return false;
        const target = assignedToVal.trim().toLowerCase();
        if (!target || target === 'unassigned') return false;
        return target === userEmail || target === userUsername || userEmail.startsWith(target) || target.includes(userUsername);
      };
      rows = rows.filter(lead => isAssignee(lead['Assigned To']));
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
  }
});

// POST a new lead (upload)
router.post('/leads', requireAuth, upload.single('screenshot'), async (req, res) => {
  try {
    const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const newLead = {
      "Date Added": new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata' }).format(new Date()), // DD/MM/YYYY
      "Screenshot URL": screenshotUrl,
      "Name of Property": req.body['Name of Property'] || '',
      "Link to Property": req.body['Link to Property'] || '',
      "Phone Number": req.body['Phone Number'] || '',
      "Assigned To": req.body['Assigned To'] || 'Unassigned',
      "Location": req.body['Location'] || '',
      "Status": 'Pending'
    };

    const doc = await initializeSheets();
    if (!doc) {
      newLead._id = "mocklead" + Date.now();
      mockLeadsDatabase.push(newLead);
      return res.status(201).json({ message: 'Lead added in Mock Mode', lead: newLead });
    }

    const { sheet } = await fetchLeadsSheet();
    if (!sheet) throw new Error('Sheet not found for append');
    
    await sheet.addRow(newLead);
    cache.del('all_leads');
    res.status(201).json({ message: 'Lead added to Google Sheets', lead: newLead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload lead', error: error.message });
  }
});

// PUT update a lead (assignment or status)
router.put('/leads/:id', requireAuth, async (req, res) => {
  try {
    const doc = await initializeSheets();
    const id = req.params.id;
    const userRole = (req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.email || '').toLowerCase();
    const userUsername = userEmail.split('@')[0];

    // Helper to check if current user is assignee
    const isAssignee = (assignedToVal) => {
      if (!assignedToVal) return false;
      const target = assignedToVal.trim().toLowerCase();
      if (!target || target === 'unassigned') return false;
      return target === userEmail || target === userUsername || userEmail.startsWith(target) || target.includes(userUsername);
    };

    if (!doc) {
      const index = mockLeadsDatabase.findIndex(r => r._id === id);
      if (index === -1) return res.status(404).json({ message: 'Mock lead not found' });
      
      const currentLead = mockLeadsDatabase[index];

      // Check assignment permission (Admin only)
      if (req.body['Assigned To'] !== undefined && req.body['Assigned To'] !== currentLead['Assigned To']) {
        if (userRole !== 'admin') {
          return res.status(403).json({ message: 'Only admin can assign or reassign leads.' });
        }
      }

      // Check status change permission (Admin or Assignee only)
      if (req.body['Status'] !== undefined && req.body['Status'] !== currentLead['Status']) {
        if (userRole !== 'admin' && !isAssignee(currentLead['Assigned To'])) {
          return res.status(403).json({ message: 'Only admin or the assigned team member can update lead status.' });
        }
      }

      mockLeadsDatabase[index] = { ...mockLeadsDatabase[index], ...req.body };
      return res.json({ message: 'Mock lead updated' });
    }

    const { sheet } = await fetchLeadsSheet();
    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(r => r.rowNumber.toString() === id);

    if (!rowToUpdate) return res.status(404).json({ message: 'Lead not found' });

    const currentAssignedTo = rowToUpdate.get('Assigned To') || '';
    const currentStatus = rowToUpdate.get('Status') || '';

    // Check assignment permission (Admin only)
    if (req.body['Assigned To'] !== undefined && req.body['Assigned To'] !== currentAssignedTo) {
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Only admin can assign or reassign leads.' });
      }
    }

    // Check status change permission (Admin or Assignee only)
    if (req.body['Status'] !== undefined && req.body['Status'] !== currentStatus) {
      if (userRole !== 'admin' && !isAssignee(currentAssignedTo)) {
        return res.status(403).json({ message: 'Only admin or the assigned team member can update lead status.' });
      }
    }

    if (req.body['Status'] !== undefined) rowToUpdate.assign({ Status: req.body['Status'] });
    if (req.body['Assigned To'] !== undefined) rowToUpdate.assign({ "Assigned To": req.body['Assigned To'] });
    if (req.body['Name of Property'] !== undefined) rowToUpdate.assign({ "Name of Property": req.body['Name of Property'] });
    if (req.body['Link to Property'] !== undefined) rowToUpdate.assign({ "Link to Property": req.body['Link to Property'] });
    if (req.body['Phone Number'] !== undefined) rowToUpdate.assign({ "Phone Number": req.body['Phone Number'] });
    if (req.body['Location'] !== undefined) rowToUpdate.assign({ "Location": req.body['Location'] });

    await rowToUpdate.save();
    cache.del('all_leads');
    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update lead', error: error.message });
  }
});

module.exports = router;

