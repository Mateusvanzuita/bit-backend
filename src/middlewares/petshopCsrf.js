// src/middlewares/petshopCsrf.js
// Defesa extra contra CSRF (além de SameSite=Lax + CORS com lista de origens): exige o cabeçalho customizado do portal.
const { PortalError } = require('../utils/petshopErrors');

const VALOR = 'bitzy-petshop-portal';

module.exports = function petshopCsrf(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  if (req.headers['x-requested-with'] !== VALOR) {
    return next(new PortalError('Requisição não autorizada.', 403, 'CSRF'));
  }
  next();
};
