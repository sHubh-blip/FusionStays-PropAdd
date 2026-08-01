const express = require('express');
const jwt = require('jsonwebtoken');
const userService = require('../services/user');
const requireAuth = require('../middleware/auth');
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
      const mustReset = user.mustResetPassword === true;
      
      // Create token including email, role, name, and mustResetPassword
      const token = jwt.sign(
        { 
          email: user.email, 
          role: user.role, 
          name: user.name || (user.email ? user.email.split('@')[0] : ''),
          mustResetPassword: mustReset
        }, 
        secret, 
        { expiresIn: '8h' }
      );
      
      return res.json({ 
        message: 'Login successful', 
        token, 
        user: { 
          email: user.email, 
          role: user.role,
          name: user.name || (user.email ? user.email.split('@')[0] : ''),
          mustResetPassword: mustReset
        } 
      });
    } else {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Login failed due to server error', error: error.message });
  }
});

router.post('/reset-password', requireAuth, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    await userService.updateUser(req.user.email, { 
      password: newPassword.trim(), 
      mustResetPassword: 'false' 
    });

    const updatedUser = await userService.findUserByEmail(req.user.email);
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

    const token = jwt.sign(
      { 
        email: updatedUser.email, 
        role: updatedUser.role, 
        name: updatedUser.name || '', 
        mustResetPassword: false 
      },
      secret,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Password reset successfully',
      token,
      user: {
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.name || '',
        mustResetPassword: false
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

module.exports = router;


