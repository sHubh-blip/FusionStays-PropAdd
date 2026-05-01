const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { initializeSheets } = require('../services/googleSheets');

// In-memory fallback if Google Sheets isn't configured for MVP testing
let mockDatabase = [
  {
    _id: "mock1",
    "Date of Entry": "2026-04-10",
    "Name of Person": "John Doe",
    "Name of property": "Sunset Villa",
    "Location": "Miami, FL",
    "Phone Number": "5551234567",
    "Source": "Inbound",
    "Reason to List": "Owners moving overseas",
    "Status": "Lead",
    "Live Date": "2026-05-01",
    "Remarks": "Needs follow-up next week.",
    "Details": "A 4-bed villa with pool."
  }
];

// Helper to get raw data
const fetchSheetRows = async () => {
  console.time('initializeSheets');
  const doc = await initializeSheets();
  console.timeEnd('initializeSheets');
  
  if (!doc) return { mock: true, rows: mockDatabase }; // Mock mode
  
  console.time('getRows');
  const sheet = doc.sheetsByIndex[0]; // First tab
  const rows = await sheet.getRows({ offset: 0, limit: 500 }); // Limit to 500 rows for performance
  console.timeEnd('getRows');
  
  console.time('mapRows');
  // Clean up circular structure from google-spreadsheet to plain JSON
  const rowData = rows.map((row) => {
    return {
      _rowIndex: row.rowNumber, // Original row number for updates
      "Date of Entry": row.get('Date of Entry') || row.get('Date Of Entry'),
      "Name of Person": row.get('Name of Person'),
      "Name of property": row.get('Name of property'),
      "Location": row.get('Location'),
      "Phone Number": row.get('Phone Number'),
      "Source": row.get('Source'),
      "Reason to List": row.get('Reason to List'),
      "Status": row.get('Status'),
      "Live Date": row.get('Live Date'),
      "Remarks": row.get('Remarks'),
      "Details": row.get('Details')
    };
  });
  console.timeEnd('mapRows');
  
  return { mock: false, rows: rowData, sheet };
};

let cache = { data: null, lastFetch: 0 };
let activeFetchPromise = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET all records
router.get('/records', requireAuth, async (req, res) => {
  try {
    const now = Date.now();
    if (cache.data && (now - cache.lastFetch) < CACHE_TTL) {
      return res.json(cache.data);
    }

    if (activeFetchPromise) {
      const data = await activeFetchPromise;
      return res.json(data.rows);
    }

    activeFetchPromise = fetchSheetRows();
    try {
      const data = await activeFetchPromise;
      cache.data = data.rows;
      cache.lastFetch = Date.now();
      res.json(data.rows);
    } finally {
      activeFetchPromise = null;
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch records', error: error.message });
  }
});

// POST a new record
router.post('/records', requireAuth, async (req, res) => {
  try {
    const doc = await initializeSheets();
    const newRecord = {
      "Date of Entry": req.body['Date of Entry'] || '',
      "Name of Person": req.body['Name of Person'] || '',
      "Name of property": req.body['Name of property'] || '',
      "Location": req.body['Location'] || '',
      "Phone Number": req.body['Phone Number'] || '',
      "Source": req.body['Source'] || '',
      "Reason to List": req.body['Reason to List'] || '',
      "Status": req.body['Status'] || '',
      "Live Date": req.body['Live Date'] || '',
      "Remarks": req.body['Remarks'] || '',
      "Details": req.body['Details'] || ''
    };

    if (!doc) {
      // Mock mode create
      newRecord._id = "mock" + Date.now();
      mockDatabase.push(newRecord);
      cache.data = null; // Invalidate cache
      return res.status(201).json({ message: 'Record added in Mock Mode', record: newRecord });
    }

    const sheet = doc.sheetsByIndex[0];
    const addedRow = await sheet.addRow(newRecord);
    newRecord._rowIndex = addedRow.rowNumber;
    
    cache.data = null; // Invalidate cache
    res.status(201).json({ message: 'Record added to Google Sheets', record: newRecord });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create record', error: error.message });
  }
});

// PUT update an existing record
router.put('/records/:id', requireAuth, async (req, res) => {
  try {
    const doc = await initializeSheets();
    const id = req.params.id; // Either "_rowIndex" or "mock id"

    if (!doc) {
      // Mock mode update
      const index = mockDatabase.findIndex(r => r._id === id);
      if (index === -1) return res.status(404).json({ message: 'Mock record not found' });
      mockDatabase[index] = { ...mockDatabase[index], ...req.body, _id: id };
      cache.data = null; // Invalidate cache
      return res.json({ message: 'Mock record updated', record: mockDatabase[index] });
    }

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(r => r.rowNumber.toString() === id);

    if (!rowToUpdate) {
      return res.status(404).json({ message: 'Row not found in Google Sheets' });
    }

    // Assign new values safely
    const updatableFields = [
      "Date of Entry", "Name of Person", "Name of property", "Location", 
      "Phone Number", "Source", "Reason to List", "Status", "Live Date", 
      "Remarks", "Details"
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
         rowToUpdate.assign({[field]: req.body[field]});
      }
    });

    await rowToUpdate.save();
    
    cache.data = null; // Invalidate cache
    res.json({ message: 'Row updated successfully in Google Sheets' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update record', error: error.message });
  }
});

module.exports = router;
