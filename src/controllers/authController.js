const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

class AuthController {
  register = asyncHandler(async (req, res) => {
    const { user, token } = await authService.register(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        user,
        token,
      },
    });
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        token,
      },
    });
  });

  getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  });
  updateProfile = asyncHandler(async (req, res) => {
  // O id vem do token decodificado pelo middleware de auth
  const userId = req.user.id; 
  const updatedUser = await authService.updateProfile(userId, req.body);

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(userId, currentPassword, newPassword);

  res.status(200).json({
    status: 'success',
    message: 'Senha alterada com sucesso',
  });
});

deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
}

module.exports = new AuthController();
