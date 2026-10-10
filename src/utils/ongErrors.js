// src/utils/ongErrors.js
// Erro com `code` legível pelo portal (ex.: ONG_BLOQUEADA). Independe de o AppError do projeto aceitar `code`.
const { AppError } = require('../middlewares/errorHandler');

class OngError extends AppError {
  constructor(message, statusCode, code) {
    super(message, statusCode);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.isOngError = true;
  }
}

// Montado no FIM do router /ong-portal: devolve { status, message, code } para os OngError
// e deixa o errorHandler global cuidar do resto.
// eslint-disable-next-line no-unused-vars
function ongErrorHandler(err, req, res, next) {
  if (err && err.isOngError) {
    return res.status(err.statusCode).json({ status: 'fail', message: err.message, code: err.code });
  }
  return next(err);
}

module.exports = { OngError, ongErrorHandler };
