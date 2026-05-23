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

const router = express.Router();

// ── Rotas públicas ──────────────────────────────────────────
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/refresh', authController.refreshToken);

// Esqueceu a senha
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/verify-reset-code', verifyResetCodeValidator, validate, authController.verifyResetCode);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// ── Rotas protegidas ────────────────────────────────────────
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.patch('/change-password', authMiddleware, authController.changePassword);
router.patch('/location', authMiddleware, authController.updateLocation); 
router.delete('/delete-account', authMiddleware, authController.deleteAccount);
router.post('/perfil/avatar', authMiddleware, uploadUserPhoto, uploadController.uploadUserPhoto);

module.exports = router;