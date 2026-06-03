const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { initializeSheets } = require('../services/googleSheets');
const cache = require('../services/cache');
const { ensureDropdownValue } = require('../utils/dropdownManager');

const CACHE_KEY = 'all_records';

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

const { fetchAndMapRecords } = require('../services/sheetService');

// Helper to get raw data
const fetchSheetRows = async () => {
  const records = await fetchAndMapRecords();
  if (!records) return { mock: true, rows: mockDatabase }; // Mock mode
  return { mock: false, rows: records };
};

// GET all records with Pagination & Filtering (Task 2)
router.get('/records', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      agent,
      location,
      search,
      paginate = 'true'
    } = req.query;

    // 1. Try cache first (Task 1)
    let records = cache.get(CACHE_KEY);
    let fromCache = true;

    if (!records) {
      const data = await fetchSheetRows();
      records = data.rows;
      cache.set(CACHE_KEY, records, 60); 
      fromCache = false;
    }

    // 2. Server-side filtering
    let filteredRecords = [...records];

    if (status) {
      filteredRecords = filteredRecords.filter(r => 
        (r["Status"] || "").toLowerCase() === status.toLowerCase()
      );
    }
    if (agent) {
      filteredRecords = filteredRecords.filter(r => 
        (r["Name of Person"] || "").toLowerCase() === agent.toLowerCase()
      );
    }
    if (location) {
      filteredRecords = filteredRecords.filter(r => 
        (r["Location"] || "").toLowerCase().includes(location.toLowerCase())
      );
    }
    if (search) {
      const q = search.toLowerCase();
      filteredRecords = filteredRecords.filter(r =>
        (r["Name of property"] || "").toLowerCase().includes(q) ||
        (r["Location"] || "").toLowerCase().includes(q) ||
        (r["Name of Person"] || "").toLowerCase().includes(q)
      );
    }

    // 3. Server-side pagination
    const total = filteredRecords.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (Number(page) - 1) * Number(limit);
    
    const paginated = paginate === 'false' 
      ? filteredRecords 
      : filteredRecords.slice(offset, offset + Number(limit));

    res.setHeader('X-Data-Source', fromCache ? 'cache' : 'sheets');
    res.json({
      data: paginated,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      },
      source: fromCache ? 'cache' : 'sheets'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch records', error: error.message });
  }
});

// POST a new record (Task 3: Invalidation)
router.post('/records', requireAuth, async (req, res) => {
  try {
    const doc = await initializeSheets();
    
    // Auto-register new values in dropdowns before inserting row
    await Promise.allSettled([
      req.body["Name of Person"] ? ensureDropdownValue('agent', req.body["Name of Person"]) : null,
      req.body["Location"]       ? ensureDropdownValue('location', req.body["Location"])   : null,
      req.body["Source"]         ? ensureDropdownValue('source', req.body["Source"])       : null,
      req.body["Status"]         ? ensureDropdownValue('status', req.body["Status"])       : null,
    ]);

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
      newRecord._id = "mock" + Date.now();
      mockDatabase.push(newRecord);
      cache.del(CACHE_KEY); 
      return res.status(201).json({ message: 'Record added in Mock Mode', record: newRecord });
    }

    const sheet = doc.sheetsByIndex[0];
    const addedRow = await sheet.addRow(newRecord);
    newRecord._rowIndex = addedRow.rowNumber;
    
    cache.del(CACHE_KEY); // Invalidate cache
    res.status(201).json({ message: 'Record added to Google Sheets', record: newRecord });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create record', error: error.message });
  }
});

// PUT update an existing record (Task 3: Invalidation)
router.put('/records/:id', requireAuth, async (req, res) => {
  try {
    const doc = await initializeSheets();
    
    // Auto-register new values in dropdowns before updating row
    await Promise.allSettled([
      req.body["Name of Person"] ? ensureDropdownValue('agent', req.body["Name of Person"]) : null,
      req.body["Location"]       ? ensureDropdownValue('location', req.body["Location"])   : null,
      req.body["Source"]         ? ensureDropdownValue('source', req.body["Source"])       : null,
      req.body["Status"]         ? ensureDropdownValue('status', req.body["Status"])       : null,
    ]);

    const id = req.params.id;

    if (!doc) {
      const index = mockDatabase.findIndex(r => r._id === id);
      if (index === -1) return res.status(404).json({ message: 'Mock record not found' });
      mockDatabase[index] = { ...mockDatabase[index], ...req.body, _id: id };
      cache.del(CACHE_KEY);
      return res.json({ message: 'Mock record updated', record: mockDatabase[index] });
    }

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(r => r.rowNumber.toString() === id);

    if (!rowToUpdate) {
      return res.status(404).json({ message: 'Row not found in Google Sheets' });
    }

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
    cache.del(CACHE_KEY); // Invalidate cache
    res.json({ message: 'Row updated successfully in Google Sheets' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update record', error: error.message });
  }
});

// Manual cache-bust endpoint (Task 3)
router.post('/cache/invalidate', (req, res) => {
  cache.flush();
  console.log('[Cache] Manually flushed at', new Date().toISOString());
  res.json({ success: true, message: 'Cache cleared' });
});

module.exports = router;
