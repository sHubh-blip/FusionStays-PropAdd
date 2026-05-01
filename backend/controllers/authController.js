const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Use values from .env for MVP
  const validEmail = process.env.ADMIN_EMAIL || 'admin@travelsync.com';
  const validPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (email === validEmail && password === validPassword) {
    // Determine the secret: use env or fallback
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
    
    // Create token (expires in 8h)
    const token = jwt.sign({ email }, secret, { expiresIn: '8h' });
    
    return res.json({ 
      message: 'Login successful', 
      token, 
      user: { email } 
    });
  } else {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
});

module.exports = router;
