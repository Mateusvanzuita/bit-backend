// src/middlewares/errorHandler.js
const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  const logData = {
    reqId:      req.id,
    userId:     req.user?.id || null,
    method:     req.method,
    url:        req.originalUrl,
    statusCode: err.statusCode,
    message:    err.message,
    // Stack só em erros inesperados (não operacionais)
    stack: err.isOperational ? undefined : err.stack,
  };

  if (err.statusCode >= 500) {
    logger.error(logData, 'Erro interno do servidor');
  } else if (err.statusCode >= 400) {
    logger.warn(logData, 'Erro de cliente');
  }

  // Desenvolvimento: retorna stack completo para facilitar debug
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status:  err.status,
      message: err.message,
      stack:   err.stack,
    });
  }

  // Produção: retorna apenas o necessário
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status:  err.status,
      message: err.message,
    });
  }

  // Erro inesperado em produção: não expõe detalhes
  return res.status(500).json({
    status:  'error',
    message: 'Algo deu errado. Tente novamente.',
  });
};

module.exports = { AppError, errorHandler };