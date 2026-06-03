const express = require('express');
const jwt = require('jsonwebtoken');
const userService = require('../services/user');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await userService.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Your account is suspended. Please contact an admin.' });
    }

    const inputHash = userService.hashPassword(password, user.salt);

    if (inputHash === user.passwordHash) {
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
      
      // Create token including email and role (expires in 8h)
      const token = jwt.sign(
        { email: user.email, role: user.role }, 
        secret, 
        { expiresIn: '8h' }
      );
      
      return res.json({ 
        message: 'Login successful', 
        token, 
        user: { 
          email: user.email, 
          role: user.role 
        } 
      });
    } else {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Login failed due to server error', error: error.message });
  }
});

module.exports = router;

