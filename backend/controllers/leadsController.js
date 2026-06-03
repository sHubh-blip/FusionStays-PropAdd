const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requireAuth = require('../middleware/auth');
const { initializeSheets } = require('../services/googleSheets');

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
  const doc = await initializeSheets();
  if (!doc) return { mock: true, rows: mockLeadsDatabase, sheet: null };
  
  // Try to find sheet by title 'Internal Leads'
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
      console.warn("Could not create 'Internal Leads' worksheet, falling back:", e.message);
      if (doc.sheetCount > 1) {
        sheet = doc.sheetsByIndex[1];
      }
    }
  }

  if (!sheet) {
      console.warn("Internal Leads sheet not found. Falling back to mock.");
      return { mock: true, rows: mockLeadsDatabase, sheet: null };
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
  
  return { mock: false, rows: rowData, sheet };
};

// GET all leads
router.get('/leads', requireAuth, async (req, res) => {
  try {
    const data = await fetchLeadsSheet();
    
    // Sort mock leads descending as well
    if (data.mock) {
      const sortedMock = [...data.rows].reverse();
      return res.json(sortedMock);
    }
    
    res.json(data.rows);
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
      "Assigned To": req.body['Assigned To'] || '',
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
    res.status(201).json({ message: 'Lead added to Google Sheets', lead: newLead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload lead', error: error.message });
  }
});

// PUT update a lead status
router.put('/leads/:id', requireAuth, async (req, res) => {
  try {
    const doc = await initializeSheets();
    const id = req.params.id;

    if (!doc) {
      const index = mockLeadsDatabase.findIndex(r => r._id === id);
      if (index === -1) return res.status(404).json({ message: 'Mock lead not found' });
      mockLeadsDatabase[index] = { ...mockLeadsDatabase[index], ...req.body };
      return res.json({ message: 'Mock lead updated' });
    }

    const { sheet } = await fetchLeadsSheet();
    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(r => r.rowNumber.toString() === id);

    if (!rowToUpdate) return res.status(404).json({ message: 'Lead not found' });

    if (req.body['Status']) rowToUpdate.assign({ Status: req.body['Status'] });
    if (req.body['Assigned To']) rowToUpdate.assign({ "Assigned To": req.body['Assigned To'] });
    if (req.body['Name of Property']) rowToUpdate.assign({ "Name of Property": req.body['Name of Property'] });
    if (req.body['Link to Property']) rowToUpdate.assign({ "Link to Property": req.body['Link to Property'] });
    if (req.body['Phone Number']) rowToUpdate.assign({ "Phone Number": req.body['Phone Number'] });
    if (req.body['Location']) rowToUpdate.assign({ "Location": req.body['Location'] });

    await rowToUpdate.save();
    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update lead', error: error.message });
  }
});

module.exports = router;

