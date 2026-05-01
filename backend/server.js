require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./controllers/authController');
const recordsRoutes = require('./controllers/recordsController');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Vercel deployment URL
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', recordsRoutes);

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
