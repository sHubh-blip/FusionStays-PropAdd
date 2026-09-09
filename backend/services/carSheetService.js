const { initializeCarSheets } = require('./carGoogleSheet');
const cache = require('./cache');

const CAR_MASTER_CACHE_KEY = 'car_master_records';
const CAR_DAYWISE_CACHE_KEY = 'car_daywise_records';

const cleanStr = (val) => val !== null && val !== undefined ? val.toString().trim() : '';

const mapCarMasterRows = (rows, headers) => {
  const getVal = (row, field) => {
    const header = headers.find(h => h.toLowerCase().trim() === field.toLowerCase().trim());
    return header ? row.get(header) : undefined;
  };

  return rows.map((row) => ({
    _rowIndex: row.rowNumber,
    "Name": cleanStr(getVal(row, 'Name')),
    "Vendorwise ID": cleanStr(getVal(row, 'Vendorwise ID')),
    "Booking ID": cleanStr(getVal(row, 'Booking ID')),
    "Booking Date": cleanStr(getVal(row, 'Booking Date')),
    "Booking Month": cleanStr(getVal(row, 'Booking Month')),
    "Start Date": cleanStr(getVal(row, 'Start Date')),
    "Check in Month": cleanStr(getVal(row, 'Check in Month')),
    "End Date": cleanStr(getVal(row, 'End Date')),
    "Guest Name": cleanStr(getVal(row, 'Guest Name')),
    "Contact No": cleanStr(getVal(row, 'Contact No')),
    "Pax": cleanStr(getVal(row, 'Pax')),
    "Start City": cleanStr(getVal(row, 'Start City')),
    "Billing Amt": cleanStr(getVal(row, 'Billing Amt')),
    "GST amt": cleanStr(getVal(row, 'GST amt')),
    "Total Sales": cleanStr(getVal(row, 'Total Sales')),
    "Purchase Cost": cleanStr(getVal(row, 'Purchase Cost')),
    "Profit": cleanStr(getVal(row, 'Profit')),
    "Advance Recieved": cleanStr(getVal(row, 'Advance Recieved')),
    "Due Collection": cleanStr(getVal(row, 'Due Collection')),
    "Status": cleanStr(getVal(row, 'Status')) || 'Confirmed'
  }))
  .filter(r => r["Booking ID"] || r["Guest Name"] || r["Contact No"] || r["Vendorwise ID"])
  .sort((a, b) => (b._rowIndex || 0) - (a._rowIndex || 0));
};

const mapCarDaywiseRows = (rows, headers) => {
  const getVal = (row, field) => {
    const header = headers.find(h => h.toLowerCase().trim() === field.toLowerCase().trim());
    return header ? row.get(header) : undefined;
  };

  return rows.map((row) => ({
    _rowIndex: row.rowNumber,
    "Name": cleanStr(getVal(row, 'Name')),
    "Vendorwise ID": cleanStr(getVal(row, 'Vendorwise ID')),
    "Booking ID": cleanStr(getVal(row, 'Booking ID')),
    "Start Date": cleanStr(getVal(row, 'Start Date')),
    "Guest Name": cleanStr(getVal(row, 'Guest Name')),
    "Contact No": cleanStr(getVal(row, 'Contact No')),
    "From": cleanStr(getVal(row, 'From')),
    "To": cleanStr(getVal(row, 'To')),
    "Itinerary": cleanStr(getVal(row, 'Itinerary')),
    "Car Type": cleanStr(getVal(row, 'Car Type')),
    "No of Cars": cleanStr(getVal(row, 'No of Cars')),
    "Vendor": cleanStr(getVal(row, 'Vendor'))
  }))
  .filter(r => r["Booking ID"] || r["Guest Name"] || r["Itinerary"] || r["Vendorwise ID"])
  .sort((a, b) => (b._rowIndex || 0) - (a._rowIndex || 0));
};

const fetchCarMasterRecords = async () => {
  try {
    const doc = await initializeCarSheets();
    if (!doc) return [];

    let sheet = doc.sheetsByTitle['Car Booking Master 26'] ||
                doc.sheetsByTitle['Car Booking Master'] ||
                doc.sheetsByTitle['Master'] ||
                Object.values(doc.sheetsByTitle).find(s => s.title.toLowerCase().includes('master')) ||
                doc.sheetsByIndex[0];

    if (!sheet) return [];

    try {
      await sheet.loadHeaderRow();
      if (!sheet.headerValues || sheet.headerValues.length === 0) {
        return [];
      }
      if (!sheet.headerValues.some(h => h.toLowerCase().trim() === 'status')) {
        try {
          await sheet.setHeaderRow([...sheet.headerValues, 'Status']);
          await sheet.loadHeaderRow();
        } catch (e) {
          console.warn("Could not auto-add Status header:", e.message);
        }
      }
      const rows = await sheet.getRows({ offset: 0, limit: 5000 });
      return mapCarMasterRows(rows, sheet.headerValues);
    } catch (e) {
      console.warn("Could not load header from Car Master Sheet:", e.message);
      return [];
    }
  } catch (err) {
    console.error("Error fetching Car Master records:", err.message);
    return [];
  }
};

const fetchCarDaywiseRecords = async () => {
  try {
    const doc = await initializeCarSheets();
    if (!doc) return [];

    let sheet = doc.sheetsByTitle['Daywise'] ||
                doc.sheetsByTitle['Day wise'] ||
                doc.sheetsByTitle['Itinerary'] ||
                Object.values(doc.sheetsByTitle).find(s => s.title.toLowerCase().includes('daywise')) ||
                doc.sheetsByIndex[1];

    if (!sheet) return [];

    try {
      await sheet.loadHeaderRow();
      if (!sheet.headerValues || sheet.headerValues.length === 0) {
        return [];
      }
      const rows = await sheet.getRows({ offset: 0, limit: 5000 });
      return mapCarDaywiseRows(rows, sheet.headerValues);
    } catch (e) {
      console.warn("Could not load header from Daywise Sheet:", e.message);
      return [];
    }
  } catch (err) {
    console.error("Error fetching Car Daywise records:", err.message);
    return [];
  }
};

const CAR_ACCOUNTS_CACHE_KEY = 'car_accounts_records';

const ACCOUNTS_HEADERS = [
  "Vendorwise ID",
  "Guest Name",
  "Date",
  "Car Type",
  "Purchase Price",
  "Advance to be Paid",
  "Advance Status",
  "Secondary Advance",
  "Secondary Advance Status",
  "Guest Collection",
  "Vendor",
  "Remarks"
];

const mapCarAccountsRows = (rows, headers) => {
  const getVal = (row, field) => {
    const header = headers.find(h => h.toLowerCase().trim() === field.toLowerCase().trim());
    return header ? row.get(header) : undefined;
  };

  return rows.map((row) => ({
    _rowIndex: row.rowNumber,
    "Vendorwise ID": cleanStr(getVal(row, 'Vendorwise ID')),
    "Guest Name": cleanStr(getVal(row, 'Guest Name')),
    "Date": cleanStr(getVal(row, 'Date')),
    "Car Type": cleanStr(getVal(row, 'Car Type')),
    "Purchase Price": cleanStr(getVal(row, 'Purchase Price')),
    "Advance to be Paid": cleanStr(getVal(row, 'Advance to be Paid')),
    "Advance Status": cleanStr(getVal(row, 'Advance Status')) || 'To be paid',
    "Secondary Advance": cleanStr(getVal(row, 'Secondary Advance')),
    "Secondary Advance Status": cleanStr(getVal(row, 'Secondary Advance Status')) || 'To be paid',
    "Guest Collection": cleanStr(getVal(row, 'Guest Collection')),
    "Vendor": cleanStr(getVal(row, 'Vendor')),
    "Remarks": cleanStr(getVal(row, 'Remarks'))
  }))
  .filter(r => r["Vendorwise ID"] || r["Guest Name"])
  .sort((a, b) => (b._rowIndex || 0) - (a._rowIndex || 0));
};

const getOrEnsureAccountsSheet = async (doc) => {
  let sheet = doc.sheetsByTitle['Accounts'] ||
              doc.sheetsByTitle['Account'] ||
              doc.sheetsByTitle['accounts'];

  if (!sheet) {
    console.log("Creating new 'Accounts' sheet in Car Packages spreadsheet...");
    sheet = await doc.addSheet({
      title: 'Accounts',
      headerValues: ACCOUNTS_HEADERS
    });
    console.log("Successfully created 'Accounts' sheet!");
  } else {
    try {
      await sheet.loadHeaderRow();
      if (!sheet.headerValues || sheet.headerValues.length === 0) {
        await sheet.setHeaderRow(ACCOUNTS_HEADERS);
        await sheet.loadHeaderRow();
      }
    } catch (e) {
      console.warn("Could not load/set header row for Accounts sheet:", e.message);
    }
  }

  return sheet;
};

const syncAccountsFromMaster = async (doc) => {
  try {
    const accountsSheet = await getOrEnsureAccountsSheet(doc);
    const existingRows = await accountsSheet.getRows({ offset: 0, limit: 5000 });
    
    // Existing Vendorwise IDs in Accounts
    const existingIds = new Set(
      existingRows
        .map(r => (r.get('Vendorwise ID') || '').trim().toLowerCase())
        .filter(Boolean)
    );

    // Fetch Master records
    const masterRecords = await fetchCarMasterRecords();
    const daywiseRecords = await fetchCarDaywiseRecords();

    // Map daywise info by Vendorwise ID or Booking ID
    const daywiseMap = {};
    for (const d of daywiseRecords) {
      const key = (d["Vendorwise ID"] || d["Booking ID"] || '').trim().toLowerCase();
      if (key && !daywiseMap[key]) {
        daywiseMap[key] = d;
      }
    }

    const rowsToAdd = [];
    for (const m of masterRecords) {
      const vId = (m["Vendorwise ID"] || '').trim();
      if (!vId || existingIds.has(vId.toLowerCase())) continue;

      const dInfo = daywiseMap[vId.toLowerCase()] || daywiseMap[(m["Booking ID"] || '').trim().toLowerCase()] || {};

      rowsToAdd.push({
        "Vendorwise ID": vId,
        "Guest Name": m["Guest Name"] || dInfo["Guest Name"] || '',
        "Date": m["Start Date"] || dInfo["Start Date"] || m["Booking Date"] || '',
        "Car Type": dInfo["Car Type"] || 'Bolero',
        "Purchase Price": m["Purchase Cost"] || '0',
        "Advance to be Paid": m["Advance Recieved"] || '0',
        "Advance Status": 'To be paid',
        "Secondary Advance": '',
        "Secondary Advance Status": 'To be paid',
        "Guest Collection": m["Due Collection"] || '',
        "Vendor": dInfo["Vendor"] || '',
        "Remarks": ''
      });
    }

    if (rowsToAdd.length > 0) {
      console.log(`[Accounts Sync] Adding ${rowsToAdd.length} missing booking records to Accounts sheet...`);
      await accountsSheet.addRows(rowsToAdd);
      console.log(`[Accounts Sync] Successfully added ${rowsToAdd.length} records!`);
    }

    cache.del(CAR_ACCOUNTS_CACHE_KEY);
    return rowsToAdd.length;
  } catch (err) {
    console.error("Error syncing Accounts from Master:", err.message);
    return 0;
  }
};

const fetchCarAccountsRecords = async () => {
  try {
    const doc = await initializeCarSheets();
    if (!doc) return [];

    const sheet = await getOrEnsureAccountsSheet(doc);
    if (!sheet) return [];

    try {
      await sheet.loadHeaderRow();
      let rows = await sheet.getRows({ offset: 0, limit: 5000 });

      // If accounts sheet has 0 rows, auto-sync from master
      if (rows.length === 0) {
        await syncAccountsFromMaster(doc);
        rows = await sheet.getRows({ offset: 0, limit: 5000 });
      }

      return mapCarAccountsRows(rows, sheet.headerValues || ACCOUNTS_HEADERS);
    } catch (e) {
      console.warn("Could not load header/rows from Accounts Sheet:", e.message);
      return [];
    }
  } catch (err) {
    console.error("Error fetching Car Accounts records:", err.message);
    return [];
  }
};

const updateCarAccountRecord = async (id, updates) => {
  const doc = await initializeCarSheets();
  if (!doc) throw new Error("Unable to connect to Google Sheets.");

  const sheet = await getOrEnsureAccountsSheet(doc);
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows({ offset: 0, limit: 5000 });

  const idStr = (id || '').toString().trim().toLowerCase();
  let rowToUpdate = rows.find(r => 
    r.rowNumber.toString() === idStr ||
    (r.get('Vendorwise ID') && r.get('Vendorwise ID').trim().toLowerCase() === idStr)
  );

  // If row not found in Accounts sheet, try to create it from Master
  if (!rowToUpdate) {
    await syncAccountsFromMaster(doc);
    const refreshedRows = await sheet.getRows({ offset: 0, limit: 5000 });
    rowToUpdate = refreshedRows.find(r => 
      r.rowNumber.toString() === idStr ||
      (r.get('Vendorwise ID') && r.get('Vendorwise ID').trim().toLowerCase() === idStr)
    );
  }

  if (!rowToUpdate) {
    // If still not found, append a new row with the updates
    const newRowData = {
      "Vendorwise ID": updates["Vendorwise ID"] || id,
      "Guest Name": updates["Guest Name"] || '',
      "Date": updates["Date"] || '',
      "Car Type": updates["Car Type"] || '',
      "Purchase Price": updates["Purchase Price"] || '0',
      "Advance to be Paid": updates["Advance to be Paid"] || '0',
      "Advance Status": updates["Advance Status"] || 'To be paid',
      "Secondary Advance": updates["Secondary Advance"] || '',
      "Secondary Advance Status": updates["Secondary Advance Status"] || 'To be paid',
      "Guest Collection": updates["Guest Collection"] || '',
      "Vendor": updates["Vendor"] || '',
      "Remarks": updates["Remarks"] || ''
    };
    await sheet.addRow(newRowData);
    cache.del(CAR_ACCOUNTS_CACHE_KEY);
    return { created: true, row: newRowData };
  }

  const updatableColumns = [
    "Guest Name", "Date", "Car Type", "Purchase Price", "Advance to be Paid",
    "Advance Status", "Secondary Advance", "Secondary Advance Status",
    "Guest Collection", "Vendor", "Remarks"
  ];

  updatableColumns.forEach(col => {
    const matchKey = Object.keys(updates).find(k => k.trim().toLowerCase() === col.toLowerCase());
    if (matchKey !== undefined && updates[matchKey] !== undefined) {
      rowToUpdate.set(col, updates[matchKey]);
    } else if (updates[col] !== undefined) {
      rowToUpdate.set(col, updates[col]);
    }
  });

  await rowToUpdate.save();
  cache.del(CAR_ACCOUNTS_CACHE_KEY);
  return { updated: true };
};

module.exports = {
  fetchCarMasterRecords,
  fetchCarDaywiseRecords,
  fetchCarAccountsRecords,
  updateCarAccountRecord,
  syncAccountsFromMaster,
  getOrEnsureAccountsSheet,
  CAR_MASTER_CACHE_KEY,
  CAR_DAYWISE_CACHE_KEY,
  CAR_ACCOUNTS_CACHE_KEY,
  ACCOUNTS_HEADERS
};
