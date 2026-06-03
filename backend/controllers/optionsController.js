const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { initializeSheets } = require('../services/googleSheets');

// Endpoint to add a new option (Member or Location) to the Google Sheet data validation
router.post('/options/add', requireAuth, requireRole(['admin']), async (req, res) => {
  const { type, value } = req.body; // type: 'person' or 'location'
  
  if (!type || !value) {
    return res.status(400).json({ message: 'Type and value are required' });
  }

  try {
    const doc = await initializeSheets();
    if (!doc) {
      return res.status(200).json({ message: 'Mock mode: Option added locally' });
    }

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadCells(); // Load all cells to get unique values

    const columnIndex = type === 'person' ? 1 : 3; // B=1, D=3
    const uniqueValues = new Set();
    
    // Collect all existing values in that column to maintain the list
    for (let i = 1; i < sheet.rowCount; i++) {
      const cellValue = sheet.getCell(i, columnIndex).value;
      if (cellValue) uniqueValues.add(cellValue.toString().trim());
    }
    
    uniqueValues.add(value.trim());
    const newList = Array.from(uniqueValues).sort();

    // Perform batchUpdate to set data validation
    // We update the validation for rows 2 to 5000 (0-indexed: 1 to 4999)
    const request = {
      setDataValidation: {
        range: {
          sheetId: sheet.sheetId,
          startRowIndex: 1,
          endRowIndex: 5000,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 1,
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: newList.map(v => ({ userEnteredValue: v })),
          },
          showCustomUi: true,
          strict: false, // Set to true if you want to block invalid entries in the sheet too
        },
      },
    };

    // google-spreadsheet v4 uses _makeBatchUpdateRequest
    await doc._makeBatchUpdateRequest([request]);

    res.json({ message: `Successfully added ${value} to ${type} list and updated Google Sheet validation.` });
  } catch (error) {
    console.error('Failed to update dropdown options:', error);
    res.status(500).json({ message: 'Failed to update dropdown options', error: error.message });
  }
});

module.exports = router;
