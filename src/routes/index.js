const express = require('express');
const authRoutes = require('./authRoutes');
const petRoutes = require('./petRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const dicaRoutes = require('./dicaRoutes');
const analiseRoutes = require('./analiseRoutes');
const termosRoutes = require('./termosRoutes')

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/pets', petRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/dicas', dicaRoutes);
router.use('/analises', analiseRoutes);
router.use('/termos', termosRoutes);

module.exports = router;
