const { initializeSheets } = require('./googleSheets');

const cleanStr = (val) => val ? val.toString().trim() : '';

const mapRows = (rows, headers) => {
  const getVal = (row, field) => {
    const header = headers.find(h => h.toLowerCase().trim() === field.toLowerCase().trim());
    return header ? row.get(header) : undefined;
  };

  return rows.map((row) => ({
    _rowIndex: row.rowNumber,
    "Date of Entry": cleanStr(getVal(row, 'Date of Entry')),
    "Name of Person": cleanStr(getVal(row, 'Name of Person')),
    "Name of property": cleanStr(getVal(row, 'Name of property')),
    "Location": cleanStr(getVal(row, 'Location')),
    "Phone Number": cleanStr(getVal(row, 'Phone Number')),
    "Source": cleanStr(getVal(row, 'Source')),
    "Reason to List": cleanStr(getVal(row, 'Reason to List')),
    "Status": cleanStr(getVal(row, 'Status')),
    "Live Date": cleanStr(getVal(row, 'Live Date')),
    "Remarks": cleanStr(getVal(row, 'Remarks')),
    "Details": cleanStr(getVal(row, 'Details'))
  }))
  .filter(row => row["Name of property"] || row["Name of Person"] || row["Phone Number"])
  .sort((a, b) => (b._rowIndex || 0) - (a._rowIndex || 0));
};

const fetchAndMapRecords = async () => {
  const doc = await initializeSheets();
  if (!doc) return null;

  const sheet = doc.sheetsByIndex[0];
  await sheet.loadHeaderRow();
  const headers = sheet.headerValues;
  
  const rows = await sheet.getRows({ offset: 0, limit: 5000 });
  return mapRows(rows, headers);
};

module.exports = {
  fetchAndMapRecords,
  mapRows
};
