const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

let initializationPromise = null;
let docCache = null;

// This initializes the Google Sheets connection securely
const initializeSheets = async () => {
  if (docCache) return docCache;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    // Return null if no Service Account credentials provided for testing
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn("WARNING: Google Sheets credentials missing in .env. Running in Mock Mode.");
      return null;
    }

    try {
      console.log("Initializing Google Sheets connection...");
      let privateKey = process.env.GOOGLE_PRIVATE_KEY;
      // Remove surrounding quotes if they were accidentally pasted into Render
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1);
      }

      const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // Replace escaped newlines with actual newlines
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
        ],
      });

      const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
      await doc.loadInfo(); // loads document properties and worksheets
      console.log(`Successfully connected to Google Sheet: "${doc.title}"`);
      docCache = doc;
      return doc;
    } catch (err) {
      console.error("Failed to connect to Google Sheets:", err.message);
      initializationPromise = null; // Allow retry on failure
      throw err;
    }
  })();

  return initializationPromise;
};

module.exports = {
  initializeSheets
};
