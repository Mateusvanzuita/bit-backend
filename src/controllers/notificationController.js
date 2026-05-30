// src/controllers/notificationController.js
const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

class NotificationController {

  // GET /notificacoes
  listar = asyncHandler(async (req, res) => {
    const notificacoes = await notificationService.listar(req.user.id);
    res.status(200).json({ status: 'success', data: { notificacoes } });
  });

  // GET /notificacoes/nao-lidas/count
  contarNaoLidas = asyncHandler(async (req, res) => {
    const count = await notificationService.contarNaoLidas(req.user.id);
    res.status(200).json({ status: 'success', data: { count } });
  });

  // PATCH /notificacoes/:id/lida
  marcarLida = asyncHandler(async (req, res) => {
    await notificationService.marcarLida(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', message: 'Notificação marcada como lida' });
  });

  // PATCH /notificacoes/todas-lidas
  marcarTodasLidas = asyncHandler(async (req, res) => {
    await notificationService.marcarTodasLidas(req.user.id);
    res.status(200).json({ status: 'success', message: 'Todas as notificações marcadas como lidas' });
  });

  // DELETE /notificacoes/:id
  deletar = asyncHandler(async (req, res) => {
    await notificationService.deletar(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', message: 'Notificação removida' });
  });
}

module.exports = new NotificationController();