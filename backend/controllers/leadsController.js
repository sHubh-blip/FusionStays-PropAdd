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
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

let mockLeadsDatabase = [];

// Helper to get raw data
const fetchLeadsSheet = async () => {
  const doc = await initializeSheets();
  if (!doc) return { mock: true, rows: mockLeadsDatabase, sheet: null };
  
  // Try to find sheet by title 'Internal Leads'
  let sheet = doc.sheetsByTitle['Internal Leads'];
  // Fallback to second sheet if title doesn't match
  if (!sheet && doc.sheetCount > 1) {
    sheet = doc.sheetsByIndex[1];
  }

  if (!sheet) {
      console.warn("Internal Leads sheet not found. Falling back to mock.");
      return { mock: true, rows: mockLeadsDatabase, sheet: null };
  }

  const rows = await sheet.getRows();
  
  const rowData = rows.map((row) => {
    return {
      _rowIndex: row.rowNumber,
      "Date Added": row.get('Date Added'),
      "Screenshot URL": row.get('Screenshot URL'),
      "Assigned To": row.get('Assigned To'),
      "Status": row.get('Status'),
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
    if (!req.file) return res.status(400).json({ message: 'No screenshot uploaded' });

    const newLead = {
      "Date Added": new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
      "Screenshot URL": `/uploads/${req.file.filename}`,
      "Assigned To": req.body['Assigned To'] || '',
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
  
      await rowToUpdate.save();
      res.json({ message: 'Lead updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update lead', error: error.message });
    }
  });

module.exports = router;
