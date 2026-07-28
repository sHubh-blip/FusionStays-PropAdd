const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const agentService = require('../services/agentService');

// Apply authentication to all agent routes
router.use(requireAuth);

// POST /api/agent/run - Start a browser automation agent job
router.post('/agent/run', async (req, res) => {
  const {
    sourceUrl,
    targetUrl,
    email,
    password,
    instructions,
    mock = false
  } = req.body;

  if (!targetUrl || !email || !password) {
    return res.status(400).json({ message: 'Target portal URL, admin email, and password are required.' });
  }

  try {
    const job = agentService.createJob({
      sourceUrl,
      targetUrl,
      email,
      password,
      instructions,
      mock: Boolean(mock)
    });
    res.status(202).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Failed to start agent job', error: error.message });
  }
});

// GET /api/agent/status/:jobId - Poll status, steps, screenshots, and result
router.get('/agent/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = agentService.getJobStatus(jobId);
  
  if (!job) {
    return res.status(404).json({ message: 'Agent job not found.' });
  }
  
  res.json(job);
});

// GET /api/agent/jobs - List all recent jobs
router.get('/agent/jobs', (req, res) => {
  try {
    const jobsList = agentService.listJobs();
    res.json(jobsList);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve jobs list', error: error.message });
  }
});

module.exports = router;
