// src/validators/authValidator.js
const { body } = require('express-validator');

const registerValidator = [
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const loginValidator = [
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidator = [
  body('email')
    .isEmail().withMessage('Informe um e-mail válido.')
    .normalizeEmail(),
];

const verifyResetCodeValidator = [
  body('email')
    .isEmail().withMessage('E-mail inválido.')
    .normalizeEmail(),
  body('code')
    .trim()
    .notEmpty().withMessage('Informe o código.')
    .isLength({ min: 6, max: 6 }).withMessage('O código deve ter 6 dígitos.')
    .isNumeric().withMessage('O código deve conter apenas números.'),
];

const resetPasswordValidator = [
  body('resetToken')
    .notEmpty().withMessage('Token de redefinição não informado.'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('A nova senha deve ter no mínimo 6 caracteres.'),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyResetCodeValidator,
  resetPasswordValidator,
};