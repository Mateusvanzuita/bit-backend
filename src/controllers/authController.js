// src/controllers/authController.js
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const { user, token } = await authService.register(req.body);
    res.status(201).json({ status: 'success', data: { user, token } });
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    res.status(200).json({ status: 'success', data: { user, token } });
  });

  getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({ status: 'success', data: { user } });
  });

  updateProfile = asyncHandler(async (req, res) => {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  });

  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json({ status: 'success', message: 'Senha alterada com sucesso' });
  });

  deleteAccount = asyncHandler(async (req, res) => {
    await authService.deleteAccount(req.user.id);
    res.status(204).json({ status: 'success', data: null });
  });

  refreshToken = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Token não fornecido' });
    }
    const oldToken = authHeader.split(' ')[1];
    const { user, token } = await authService.refreshToken(oldToken);
    res.status(200).json({ status: 'success', data: { user, token } });
  });

  // ─── ESQUECEU A SENHA ──────────────────────────────────────────────────

  // POST /auth/forgot-password — envia o código por email
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    // Sempre retorna 200 para não vazar se o email existe
    await authService.sendPasswordResetCode(email.toLowerCase().trim());
    res.status(200).json({
      status: 'success',
      message: 'Se este email estiver cadastrado, você receberá um código em breve.',
    });
  });

  // POST /auth/verify-reset-code — valida o código e retorna resetToken
  verifyResetCode = asyncHandler(async (req, res) => {
    const { email, code } = req.body;
    const { resetToken } = await authService.verifyPasswordResetCode(
      email.toLowerCase().trim(),
      code.trim(),
    );
    res.status(200).json({ status: 'success', data: { resetToken } });
  });

  // POST /auth/reset-password — redefine a senha com o resetToken
  resetPassword = asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body;
    await authService.resetPassword(resetToken, newPassword);
    res.status(200).json({ status: 'success', message: 'Senha redefinida com sucesso.' });
  });

  // Adicione este método dentro da classe AuthController no authController.js

  // PATCH /auth/location — salva localização do usuário
  updateLocation = asyncHandler(async (req, res) => {
    const { latitude, longitude, cidade, estado, pais } = req.body;
    const updatedUser = await authService.updateLocation(req.user.id, {
      latitude,
      longitude,
      cidade,
      estado,
      pais,
    });
    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  });
}

module.exports = new AuthController();