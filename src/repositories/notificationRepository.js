// src/repositories/notificationRepository.js
const prisma = require('../config/database');

class NotificationRepository {
  // Lista todas as notificações do usuário, mais recentes primeiro
  async findByUser(userId) {
    return await prisma.notificacao.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Contagem de não lidas (usa o índice [userId, lida] do schema)
  async countNaoLidas(userId) {
    return await prisma.notificacao.count({
      where: { userId, lida: false },
    });
  }

  // Cria uma notificação no banco
  async create({ userId, titulo, mensagem, tipo, pathKey = null }) {
    return await prisma.notificacao.create({
      data: { userId, titulo, mensagem, tipo, pathKey },
    });
  }

  // Marca uma notificação como lida
  async marcarLida(id, userId) {
    // O userId garante que o usuário só pode marcar as próprias notificações
    return await prisma.notificacao.updateMany({
      where: { id, userId },
      data: { lida: true, lidaEm: new Date() },
    });
  }

  // Marca todas as não lidas do usuário como lidas
  async marcarTodasLidas(userId) {
    return await prisma.notificacao.updateMany({
      where: { userId, lida: false },
      data: { lida: true, lidaEm: new Date() },
    });
  }

  // Deleta uma notificação (somente do próprio usuário)
  async deletar(id, userId) {
    return await prisma.notificacao.deleteMany({
      where: { id, userId },
    });
  }
}

module.exports = new NotificationRepository();