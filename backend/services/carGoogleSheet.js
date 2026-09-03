const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

let carDocCache = null;
let carInitializationPromise = null;

const initializeCarSheets = async () => {
  if (carDocCache) return carDocCache;
  if (carInitializationPromise) return carInitializationPromise;

  carInitializationPromise = (async () => {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn("WARNING: Google Sheets credentials missing in .env. Running Car Sheets in Mock Mode.");
      return null;
    }

    const sheetId = process.env.GOOGLE_CAR_SHEET_ID || '1dAF_TVyfq68-Svgy71FuftIb8lPSCHukkSTTn_JJqUk';

    try {
      console.log("Initializing Car Packages Google Sheets connection...");
      let privateKey = process.env.GOOGLE_PRIVATE_KEY;
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1);
      }

      const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
      await doc.loadInfo();
      console.log(`Successfully connected to Car Packages Sheet: "${doc.title}"`);
      carDocCache = doc;
      return doc;
    } catch (err) {
      console.error("Failed to connect to Car Packages Google Sheet:", err.message);
      carInitializationPromise = null;
      return null;
    }
  })();

  return carInitializationPromise;
};

module.exports = {
  initializeCarSheets
};
