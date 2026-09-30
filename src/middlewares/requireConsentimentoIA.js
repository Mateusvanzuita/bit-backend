const prisma = require('../config/database');
const { AppError } = require('./errorHandler');

async function requireConsentimentoIA(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError('Usuário não autenticado.', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        consentimentoIA: true,
      },
    });

    if (!user) {
      return next(new AppError('Usuário não encontrado.', 404));
    }

    if (!user.consentimentoIA) {
      return next(
        new AppError(
          'É necessário autorizar o uso de inteligência artificial antes de utilizar este recurso.',
          403,
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireConsentimentoIA;