const env = require('../config/env');
const { AppError } = require('./errorHandler');

/**
 * Protege rotas de comunicação servidor-a-servidor (ex: o CRM consultando
 * métricas do Bitzy Club). Não é autenticação de usuário — exige um header
 * com uma chave secreta compartilhada entre os dois backends, nunca exposta
 * a clientes finais (app ou browser).
 */
function authenticateInternal(req, res, next) {
  const chaveRecebida = req.headers['x-internal-api-key'];

  if (!env.internalApiKey) {
    return next(new AppError('INTERNAL_API_KEY não configurada no servidor.', 500));
  }

  if (!chaveRecebida || chaveRecebida !== env.internalApiKey) {
    return next(new AppError('Não autorizado.', 401));
  }

  next();
}

module.exports = { authenticateInternal };