// src/services/notificationService.js
//
// Responsabilidades:
//   1. CRUD de notificações (lidas, contagem, delete)
//   2. Criação + envio de push em uma só chamada (notificar)
//
// Uso nos outros services:
//   const notificationService = require('./notificationService');
//   await notificationService.notificar(userId, {
//     titulo: 'Análise concluída',
//     mensagem: 'Veja o resultado do check-up do Rex.',
//     tipo: 'ANALISE',
//     pathKey: '/analise/historico/abc123',
//   });

const prisma = require('../config/database');
const notificationRepository = require('../repositories/notificationRepository');
const { enviarPush } = require('./pushService');

class NotificationService {

  // ── CRUD ──────────────────────────────────────────────────

  async listar(userId) {
    return await notificationRepository.findByUser(userId);
  }

  async contarNaoLidas(userId) {
    return await notificationRepository.countNaoLidas(userId);
  }

  async marcarLida(id, userId) {
    const result = await notificationRepository.marcarLida(id, userId);
    if (result.count === 0) {
      const { AppError } = require('../middlewares/errorHandler');
      throw new AppError('Notificação não encontrada', 404);
    }
  }

  async marcarTodasLidas(userId) {
    await notificationRepository.marcarTodasLidas(userId);
  }

  async deletar(id, userId) {
    const result = await notificationRepository.deletar(id, userId);
    if (result.count === 0) {
      const { AppError } = require('../middlewares/errorHandler');
      throw new AppError('Notificação não encontrada', 404);
    }
  }

  // ── NOTIFICAR (criar + push) ───────────────────────────────
  //
  // Método central — use este em todos os outros services.
  // Nunca lança exceção: falhas de push não devem quebrar o fluxo principal.

  async notificar(userId, { titulo, mensagem, tipo, pathKey = null }) {
    try {
      // 1. Persiste no banco
      const notificacao = await notificationRepository.create({
        userId,
        titulo,
        mensagem,
        tipo,
        pathKey,
      });

      // 2. Busca pushToken do usuário (somente se notificações ativas)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true, notificacoesAtivas: true },
      });

      // 3. Envia push se o usuário tiver token e notificações ativas
      if (user?.pushToken && user.notificacoesAtivas) {
        await enviarPush(user.pushToken, titulo, mensagem, { pathKey });
      }

      return notificacao;
    } catch (err) {
      // Log mas não propaga — notificação nunca deve quebrar a feature principal
      console.error('[NotificationService] Erro ao notificar userId', userId, ':', err.message);
    }
  }

  // ── HELPERS SEMÂNTICOS ────────────────────────────────────
  // Atalhos para os tipos mais comuns — chame estes nos outros services.

  async notificarAnalise(userId, { titulo, mensagem, pathKey }) {
    return this.notificar(userId, { titulo, mensagem, tipo: 'ANALISE', pathKey });
  }

  async notificarDica(userId, { titulo, mensagem, pathKey }) {
    return this.notificar(userId, { titulo, mensagem, tipo: 'DICA', pathKey });
  }

  async notificarSaude(userId, { titulo, mensagem, pathKey }) {
    return this.notificar(userId, { titulo, mensagem, tipo: 'SAUDE', pathKey });
  }

  async notificarLembrete(userId, { titulo, mensagem, pathKey }) {
    return this.notificar(userId, { titulo, mensagem, tipo: 'LEMBRETE', pathKey });
  }

  async notificarSistema(userId, { titulo, mensagem, pathKey }) {
    return this.notificar(userId, { titulo, mensagem, tipo: 'SISTEMA', pathKey });
  }
}

module.exports = new NotificationService();