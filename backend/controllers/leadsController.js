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

// POST a new lead with image
router.post('/leads', requireAuth, upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No screenshot uploaded' });
    }

    const { sheet, mock } = await fetchLeadsSheet();
    
    // Create base URL using protocol and host if available
    // Otherwise fallback to relative URL
    let baseUrl = '';
    if (req.protocol && req.get('host')) {
        baseUrl = `${req.protocol}://${req.get('host')}`;
    }
    
    const newLead = {
      "Date Added": new Date().toISOString().split('T')[0],
      "Screenshot URL": `${baseUrl}/uploads/${req.file.filename}`,
      "Assigned To": req.body.assignedTo || '',
      "Status": 'Pending',
    };

    if (mock) {
      newLead._id = "mockLead" + Date.now();
      mockLeadsDatabase.push(newLead);
      return res.status(201).json({ message: 'Lead added in Mock Mode', lead: newLead });
    }

    const addedRow = await sheet.addRow(newLead);
    newLead._rowIndex = addedRow.rowNumber;
    
    res.status(201).json({ message: 'Lead added to Google Sheets', lead: newLead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create lead', error: error.message });
  }
});

// PUT update a lead status (e.g. Added)
router.put('/leads/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id; // Either "_rowIndex" or "mock id"
    const { sheet, mock } = await fetchLeadsSheet();

    if (mock) {
      const index = mockLeadsDatabase.findIndex(r => r._id === id);
      if (index === -1) return res.status(404).json({ message: 'Mock lead not found' });
      mockLeadsDatabase[index] = { ...mockLeadsDatabase[index], ...req.body, _id: id };
      return res.json({ message: 'Mock lead updated', lead: mockLeadsDatabase[index] });
    }

    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(r => r.rowNumber.toString() === id);

    if (!rowToUpdate) {
      return res.status(404).json({ message: 'Row not found in Google Sheets' });
    }

    const updatableFields = ["Assigned To", "Status"];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
         rowToUpdate.assign({[field]: req.body[field]});
      }
    });

    await rowToUpdate.save();
    
    res.json({ message: 'Lead updated successfully in Google Sheets' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update lead', error: error.message });
  }
});

module.exports = router;
