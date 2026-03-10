const express = require('express');
const authController = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidator');
const validate = require('../middlewares/validate');
const authMiddleware = require('../middlewares/auth');
const { uploadUserPhoto } = require('../middlewares/upload');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Public routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.patch('/change-password', authMiddleware, authController.changePassword);
router.delete('/delete-account', authMiddleware, authController.deleteAccount);

// Upload de avatar
router.post('/perfil/avatar', authMiddleware, uploadUserPhoto, uploadController.uploadUserPhoto);

module.exports = router;