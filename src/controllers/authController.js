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
}

module.exports = new AuthController();
