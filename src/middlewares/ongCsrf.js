// src/middlewares/ongCsrf.js
// Defesa extra contra CSRF (além de SameSite=Lax + CORS com lista de origens):
// exige o cabeçalho customizado que o portal envia. Um formulário/imagem de outro site não consegue defini-lo,
// e um fetch de outra origem precisaria de preflight CORS, que só passa para origens permitidas.
const { OngError } = require('../utils/ongErrors');

const VALOR = 'bitzy-ong-portal';

module.exports = function ongCsrf(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  if (req.headers['x-requested-with'] !== VALOR) {
    return next(new OngError('Requisição não autorizada.', 403, 'CSRF'));
  }
  next();
};
