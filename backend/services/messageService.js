const { initializeSheets } = require('./googleSheets');

// In-memory cache for recent messages
let messagesCache = [];
const MAX_CACHE_SIZE = 1000; // Keep last 1000 messages in memory total

// Get the Messages worksheet, creating it if it doesn't exist
async function getMessageSheet() {
  const doc = await initializeSheets();
  if (!doc) return null;

  let sheet = doc.sheetsByTitle['Messages'];
  if (!sheet) {
    console.log("Creating 'Messages' worksheet in Google Sheet...");
    try {
      sheet = await doc.addSheet({
        title: 'Messages',
        headerValues: ['sender', 'recipient', 'message', 'timestamp']
      });
    } catch (err) {
      console.warn("Could not dynamically create 'Messages' sheet:", err.message);
    }
  }
  return sheet;
}

// Load message history from Google Sheets on startup
async function initializeMessageHistory() {
  try {
    const sheet = await getMessageSheet();
    if (!sheet) {
      console.log("Running Chat in Mock Mode (Memory only).");
      return;
    }

    const totalRows = sheet.rowCount;
    // Load last 500 rows
    const limit = 500;
    const offset = Math.max(0, totalRows - limit);
    const rows = await sheet.getRows({ offset, limit });

    console.log(`Loading last ${rows.length} messages from Google Sheets into memory...`);
    messagesCache = rows.map(row => ({
      sender: (row.get('sender') || '').toLowerCase().trim(),
      recipient: (row.get('recipient') || '').toLowerCase().trim(),
      message: row.get('message') || '',
      timestamp: row.get('timestamp') || new Date().toISOString()
    }));
    console.log("Message cache initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize message history cache:", err.message);
  }
}

// Get messages history between two users
async function getConversation(userA, userB) {
  const emailA = userA.toLowerCase().trim();
  const emailB = userB.toLowerCase().trim();

  // If cache is empty, we try initializing first (or return empty if mock)
  if (messagesCache.length === 0) {
    const sheet = await getMessageSheet();
    if (sheet) {
      const rows = await sheet.getRows();
      messagesCache = rows.map(row => ({
        sender: (row.get('sender') || '').toLowerCase().trim(),
        recipient: (row.get('recipient') || '').toLowerCase().trim(),
        message: row.get('message') || '',
        timestamp: row.get('timestamp') || new Date().toISOString()
      }));
    }
  }

  // Filter messages between userA and userB
  return messagesCache.filter(m => 
    (m.sender === emailA && m.recipient === emailB) || 
    (m.sender === emailB && m.recipient === emailA)
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Save a new message
async function saveMessage({ sender, recipient, message }) {
  const newMessage = {
    sender: sender.toLowerCase().trim(),
    recipient: recipient.toLowerCase().trim(),
    message,
    timestamp: new Date().toISOString()
  };

  // Add to in-memory cache
  messagesCache.push(newMessage);
  
  // Maintain cache size limit
  if (messagesCache.length > MAX_CACHE_SIZE) {
    messagesCache.shift();
  }

  // Asynchronously append to Google Sheet (non-blocking)
  getMessageSheet().then(async (sheet) => {
    if (sheet) {
      await sheet.addRow(newMessage);
    }
  }).catch(err => {
    console.error("Failed to append message row to Google Sheet:", err.message);
  });

  return newMessage;
}

// Get all messages where user is sender or recipient
async function getAllMessagesForUser(email) {
  const userEmail = email.toLowerCase().trim();

  if (messagesCache.length === 0) {
    const sheet = await getMessageSheet();
    if (sheet) {
      const rows = await sheet.getRows();
      messagesCache = rows.map(row => ({
        sender: (row.get('sender') || '').toLowerCase().trim(),
        recipient: (row.get('recipient') || '').toLowerCase().trim(),
        message: row.get('message') || '',
        timestamp: row.get('timestamp') || new Date().toISOString()
      }));
    }
  }

  return messagesCache.filter(m => m.sender === userEmail || m.recipient === userEmail)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

module.exports = {
  initializeMessageHistory,
  getConversation,
  getAllMessagesForUser,
  saveMessage
};
