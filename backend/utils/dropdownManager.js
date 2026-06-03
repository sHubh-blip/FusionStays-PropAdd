// backend/utils/dropdownManager.js
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

// ── Auth Setup ──────────────────────────────────────────────
const privateKey = process.env.GOOGLE_PRIVATE_KEY 
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
  : null;

const auth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheetsAPI = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// ── Column Config ────────────────────────────────────────────
const DROPDOWN_COLUMNS = {
  agent: {
    colIndex: 1,        // Column B
    sheetId: 0,
    label: 'Agent',
    startRowIndex: 1,
    endRowIndex: 10000,
  },
  location: {
    colIndex: 3,        // Column D
    sheetId: 0,
    label: 'Location',
    startRowIndex: 1,
    endRowIndex: 10000,
  },
  source: {
    colIndex: 5,        // Column F
    sheetId: 0,
    label: 'Source',
    startRowIndex: 1,
    endRowIndex: 10000,
  },
  status: {
    colIndex: 7,        // Column H
    sheetId: 0,
    label: 'Status',
    startRowIndex: 1,
    endRowIndex: 10000,
  },
};

// ── Internal: Read current validation rule for a column ───────
async function _readCurrentValues(columnKey) {
  const col = DROPDOWN_COLUMNS[columnKey];
  if (!col) throw new Error(`Unknown dropdown column key: "${columnKey}"`);

  const response = await sheetsAPI.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    includeGridData: true,
    ranges: [
      `${_colIndexToLetter(col.colIndex)}2`,
    ],
    fields: 'sheets.data.rowData.values.dataValidation',
  });

  const rows = response.data.sheets?.[0]?.data?.[0]?.rowData;
  if (!rows || rows.length === 0) return [];

  const cell = rows[0]?.values?.[0];
  const conditionValues = cell?.dataValidation?.condition?.values;

  if (!conditionValues || conditionValues.length === 0) return [];

  return conditionValues.map(v => v.userEnteredValue).filter(Boolean);
}

// ── Internal: Write updated list back to the sheet ─────────────
async function _writeValidationRule(columnKey, valuesList) {
  const col = DROPDOWN_COLUMNS[columnKey];

  const cleanList = [...new Set(valuesList.map(v => v.trim()).filter(Boolean))];

  const request = {
    setDataValidation: {
      range: {
        sheetId: col.sheetId,
        startRowIndex: col.startRowIndex,
        endRowIndex: col.endRowIndex,
        startColumnIndex: col.colIndex,
        endColumnIndex: col.colIndex + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: cleanList.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: true,
      },
    },
  };

  await sheetsAPI.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [request] },
  });

  return cleanList;
}

function _colIndexToLetter(index) {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

async function getAllDropdowns() {
  const results = {};
  for (const key of Object.keys(DROPDOWN_COLUMNS)) {
    try {
      results[key] = {
        label: DROPDOWN_COLUMNS[key].label,
        values: await _readCurrentValues(key),
      };
    } catch (err) {
      console.error(`Error reading ${key} dropdown:`, err.message);
      results[key] = { label: DROPDOWN_COLUMNS[key].label, values: [], error: err.message };
    }
  }
  return results;
}

async function getDropdown(columnKey) {
  const col = DROPDOWN_COLUMNS[columnKey];
  if (!col) throw new Error(`Unknown column: "${columnKey}"`);
  const values = await _readCurrentValues(columnKey);
  return { key: columnKey, label: col.label, values };
}

async function addDropdownValues(columnKey, newValues) {
  const toAdd = Array.isArray(newValues) ? newValues : [newValues];
  const current = await _readCurrentValues(columnKey);
  const currentLower = current.map(v => v.toLowerCase().trim());

  const added = [];
  const skipped = [];

  for (const val of toAdd) {
    if (!val || !val.trim()) continue;
    if (currentLower.includes(val.toLowerCase().trim())) {
      skipped.push(val);
    } else {
      added.push(val.trim());
    }
  }

  let finalList = current;
  if (added.length > 0) {
    finalList = await _writeValidationRule(columnKey, [...current, ...added]);
    console.log(`[Dropdown] Added to ${columnKey}:`, added);
  }

  return { added, skipped, values: finalList };
}

async function deleteDropdownValues(columnKey, removeValues) {
  const toRemove = Array.isArray(removeValues) ? removeValues : [removeValues];
  const current = await _readCurrentValues(columnKey);

  const removeLower = toRemove.map(v => v.toLowerCase().trim());
  const deleted = [];
  const notFound = [];

  for (const val of toRemove) {
    if (current.some(c => c.toLowerCase().trim() === val.toLowerCase().trim())) {
      deleted.push(val);
    } else {
      notFound.push(val);
    }
  }

  const remaining = current.filter(
    v => !removeLower.includes(v.toLowerCase().trim())
  );

  let finalList = current;
  if (deleted.length > 0) {
    finalList = await _writeValidationRule(columnKey, remaining);
    console.log(`[Dropdown] Deleted from ${columnKey}:`, deleted);
  }

  return { deleted, notFound, values: finalList };
}

async function renameDropdownValue(columnKey, oldValue, newValue) {
  const current = await _readCurrentValues(columnKey);

  const index = current.findIndex(
    v => v.toLowerCase().trim() === oldValue.toLowerCase().trim()
  );

  if (index === -1) {
    throw new Error(`Value "${oldValue}" not found in ${columnKey} dropdown`);
  }

  const updated = [...current];
  updated[index] = newValue.trim();

  const finalList = await _writeValidationRule(columnKey, updated);

  console.log(`[Dropdown] Renamed in ${columnKey}: "${oldValue}" → "${newValue}"`);
  return { renamed: true, from: oldValue, to: newValue, values: finalList };
}

async function ensureDropdownValue(columnKey, value) {
  if (!value || !value.toString().trim()) return;
  return await addDropdownValues(columnKey, [value.toString().trim()]);
}

module.exports = {
  getAllDropdowns,
  getDropdown,
  addDropdownValues,
  deleteDropdownValues,
  renameDropdownValue,
  ensureDropdownValue,
  DROPDOWN_COLUMNS,
};
