const express = require('express');
const router = express.Router();

// simple test endpoint
router.get('/', (req, res) => {
  res.json([
    { id: 1, name: 'Alice', role: 'student' },
    { id: 2, name: 'Dr. Smith', role: 'faculty' }
  ]);
});

module.exports = router;
