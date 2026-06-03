const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const messageService = require('../services/messageService');

// Apply authentication middleware to all chat endpoints
router.use(requireAuth);

// GET /messages - retrieve all messages involving the current user (for global unread counts)
router.get('/messages', async (req, res) => {
  const userEmail = req.user.email;
  try {
    const history = await messageService.getAllMessagesForUser(userEmail);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve message history', error: error.message });
  }
});

// GET /messages/:recipientEmail - retrieve conversation log
router.get('/messages/:recipientEmail', async (req, res) => {
  const senderEmail = req.user.email;
  const recipientEmail = req.params.recipientEmail;

  if (!recipientEmail) {
    return res.status(400).json({ message: 'Recipient email is required.' });
  }

  try {
    const history = await messageService.getConversation(senderEmail, recipientEmail);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve conversation history', error: error.message });
  }
});

// POST /messages - send a message
router.post('/messages', async (req, res) => {
  const senderEmail = req.user.email;
  const { recipient, message } = req.body;

  if (!recipient || !message) {
    return res.status(400).json({ message: 'Recipient and message are required.' });
  }

  try {
    const sentMessage = await messageService.saveMessage({
      sender: senderEmail,
      recipient,
      message
    });
    res.status(201).json(sentMessage);
  } catch (error) {
    res.status(550).json({ message: 'Failed to send message', error: error.message });
  }
});

module.exports = router;
