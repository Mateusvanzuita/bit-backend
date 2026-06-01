// src/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyResetCodeValidator,
  resetPasswordValidator,
} = require('../validators/authValidator');
const validate = require('../middlewares/validate');
const authMiddleware = require('../middlewares/auth');
const { uploadUserPhoto } = require('../middlewares/upload');
const uploadController = require('../controllers/uploadController');
const { authLimiter, registerLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// ── Rotas públicas ──────────────────────────────────────────
router.post('/register', registerLimiter, registerValidator, validate, authController.register);
router.post('/login',    authLimiter,     loginValidator,    validate, authController.login);
router.post('/refresh',  authLimiter,     authController.refreshToken);

// Esqueceu a senha — mesmo limiter do login (evita enumeração de e-mails)
router.post('/forgot-password',   authLimiter, forgotPasswordValidator,   validate, authController.forgotPassword);
router.post('/verify-reset-code', authLimiter, verifyResetCodeValidator,  validate, authController.verifyResetCode);
router.post('/reset-password',    authLimiter, resetPasswordValidator,    validate, authController.resetPassword);

// ── Rotas protegidas ────────────────────────────────────────
router.get('/profile',         authMiddleware, authController.getProfile);
router.put('/profile',         authMiddleware, authController.updateProfile);
router.patch('/change-password', authMiddleware, authController.changePassword);
router.patch('/location',      authMiddleware, authController.updateLocation);
router.patch('/push-token',    authMiddleware, authController.updatePushToken);
router.delete('/delete-account', authMiddleware, authController.deleteAccount);
router.post('/perfil/avatar',  authMiddleware, uploadUserPhoto, uploadController.uploadUserPhoto);

module.exports = router;