const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const userService = require('../services/user');

// Apply auth and admin check to all user management routes
router.use(requireAuth);

// GET /users/list - list all active users for chat (available to all logged-in users)
router.get('/users/list', async (req, res) => {
  try {
    const users = await userService.listUsers();
    const activeUsers = users.filter(u => u.status === 'active');
    res.json(activeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve users list', error: error.message });
  }
});

// GET /users - list all users
router.get('/users', requireRole(['admin']), async (req, res) => {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve users', error: error.message });
  }
});

// POST /users - create a new user
router.post('/users', requireRole(['admin']), async (req, res) => {
  const { email, password, role, status } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const newUser = await userService.createUser({
      email,
      password,
      role: role || 'user',
      status: status || 'active'
    });
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /users/:email - update a user
router.put('/users/:email', requireRole(['admin']), async (req, res) => {
  const { email } = req.params;
  const { role, status, password } = req.body;

  try {
    const updatedUser = await userService.updateUser(email, { role, status, password });
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /users/:email - delete a user
router.delete('/users/:email', requireRole(['admin']), async (req, res) => {
  const { email } = req.params;

  try {
    const currentAdminEmail = req.user.email.toLowerCase().trim();
    if (email.toLowerCase().trim() === currentAdminEmail) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    await userService.deleteUser(email);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
