require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeSheets } = require('./services/googleSheets');
const cache = require('./services/cache');

const authRoutes = require('./controllers/authController');
const recordsRoutes = require('./controllers/recordsController');
const leadsRoutes = require('./controllers/leadsController');
const optionsRoutes = require('./controllers/optionsController');
const dropdownRoutes = require('./controllers/dropdownController');
const userRoutes = require('./controllers/userController');
const messageRoutes = require('./controllers/messageController');
const agentRoutes = require('./controllers/agentController');

const app = express();

// Task 8: Performance Monitoring Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const source = res.getHeader('X-Data-Source') || 'server';
    console.log(`[${req.method}] ${req.path} — ${duration}ms (${source})`);
    if (duration > 1000) {
      console.warn(`⚠️ SLOW RESPONSE: ${req.path} took ${duration}ms`);
    }
  });
  next();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', recordsRoutes);
app.use('/api', leadsRoutes);
app.use('/api', optionsRoutes);
app.use('/api', dropdownRoutes);
app.use('/api', userRoutes);
app.use('/api', messageRoutes);
app.use('/api', agentRoutes);


// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  const { fetchAndMapRecords } = require('./services/sheetService');
  const { getUserSheet } = require('./services/user');
  const { initializeMessageHistory } = require('./services/messageService');
  const PREFETCH_INTERVAL = 3 * 60 * 1000; // 3 minutes to stay within Google API quota limits
  
  async function initializeServerData() {
    try {
      console.log('[Prefetch] Refreshing cache from Google Sheets...');
      const records = await fetchAndMapRecords();
      
      if (records) {
        cache.set('all_records', records, 300); // 5 min TTL
        console.log(`[Prefetch] Successfully cached ${records.length} records`);
      }
    } catch (err) {
      console.error('[Prefetch] Failed:', err.message);
    }

    setTimeout(() => {
      getUserSheet().catch(err => console.error("Failed to initialize Users sheet:", err.message));
    }, 2000);

    setTimeout(() => {
      initializeMessageHistory().catch(err => console.error("Failed to initialize Message history:", err.message));
    }, 4000);
  }

  // Initial prefetch and set 3-minute interval
  initializeServerData();
  setInterval(initializeServerData, PREFETCH_INTERVAL);
});
