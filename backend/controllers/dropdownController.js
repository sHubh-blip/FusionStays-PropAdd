// backend/controllers/dropdownController.js
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const {
  getAllDropdowns,
  getDropdown,
  addDropdownValues,
  deleteDropdownValues,
  renameDropdownValue,
} = require('../utils/dropdownManager');

// All dropdown routes require authentication
router.use(requireAuth);

// ── GET /api/dropdowns
// Returns all columns and their current option lists
router.get('/dropdowns', async (req, res) => {
  try {
    const all = await getAllDropdowns();
    res.json({ success: true, dropdowns: all });
  } catch (err) {
    console.error('[GET /dropdowns]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/dropdowns/:column
// Returns options for one column
router.get('/dropdowns/:column', async (req, res) => {
  try {
    const result = await getDropdown(req.params.column);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[GET /dropdowns/${req.params.column}]`, err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST /api/dropdowns/:column/add
// Add one or more values to a column's dropdown
router.post('/dropdowns/:column/add', requireRole(['admin']), async (req, res) => {
  try {
    const { values } = req.body;
    if (!values) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request body must include "values" field' 
      });
    }
    const result = await addDropdownValues(req.params.column, values);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[POST /dropdowns/${req.params.column}/add]`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/dropdowns/:column/delete
// Remove one or more values from a column's dropdown
router.delete('/dropdowns/:column/delete', requireRole(['admin']), async (req, res) => {
  try {
    const { values } = req.body;
    if (!values) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request body must include "values" field' 
      });
    }
    const result = await deleteDropdownValues(req.params.column, values);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[DELETE /dropdowns/${req.params.column}/delete]`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/dropdowns/:column/rename
// Rename an existing value
router.patch('/dropdowns/:column/rename', requireRole(['admin']), async (req, res) => {
  try {
    const { oldValue, newValue } = req.body;
    if (!oldValue || !newValue) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both "oldValue" and "newValue" are required' 
      });
    }
    const result = await renameDropdownValue(
      req.params.column, oldValue, newValue
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[PATCH /dropdowns/${req.params.column}/rename]`, err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
