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

module.exports = {
  fetchCarMasterRecords,
  fetchCarDaywiseRecords,
  CAR_MASTER_CACHE_KEY,
  CAR_DAYWISE_CACHE_KEY
};
