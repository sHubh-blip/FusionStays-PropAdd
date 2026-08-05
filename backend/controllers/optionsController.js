const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { initializeSheets } = require('../services/googleSheets');
const { addDropdownValues } = require('../utils/dropdownManager');

// Endpoint to add a new option (Member or Location) to the Google Sheet data validation
router.post('/options/add', requireAuth, async (req, res) => {
  const { type, value } = req.body; // type: 'person' or 'location' or 'source'
  
  if (!type || !value) {
    return res.status(400).json({ message: 'Type and value are required' });
  }

  try {
    const doc = await initializeSheets();
    if (!doc) {
      return res.status(200).json({ message: 'Mock mode: Option added locally' });
    }

    let columnKey = type;
    if (type === 'person') columnKey = 'agent';

    await addDropdownValues(columnKey, value);

    res.json({ message: `Successfully added ${value} to ${type} list and updated Google Sheet validation.` });
  } catch (error) {
    console.error('Failed to update dropdown options:', error);
    res.status(500).json({ message: error.message || 'Failed to update dropdown options' });
  }
});

module.exports = router;
