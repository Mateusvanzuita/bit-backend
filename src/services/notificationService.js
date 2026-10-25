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

// Categoria -> campo de preferência no User.
// 'IMPORTANTE' (ou null) não tem campo: só respeita o toggle geral.
const CAMPO_POR_CATEGORIA = {
  PET: 'pushPet',
  ADOCAO: 'pushAdocao',
  CLUBE: 'pushClube',
  NOVIDADES: 'pushNovidades',
};

function inferirCategoria({ categoria, pathKey, tipo }) {
  if (categoria) return categoria;
  const p = pathKey || '';
  if (p.startsWith('/adocao')) return 'ADOCAO';
  if (p.startsWith('/clube') || p.startsWith('/ofertas')) return 'CLUBE';
  if (p.startsWith('/news')) return 'NOVIDADES';
  if (
    p.startsWith('/pets') ||
    p.startsWith('/analise') ||
    p.startsWith('/vaccines') ||
    p.startsWith('/tips')
  ) {
    return 'PET';
  }
  if (['DICA', 'ANALISE', 'SAUDE'].includes(tipo)) return 'PET';
  return null;
}

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

  async notificar(userId, { titulo, mensagem, tipo, pathKey = null, categoria = null }) {
    try {
      // 1. Persiste no banco (o sininho registra tudo, independente das preferências de push)
      const notificacao = await notificationRepository.create({
        userId,
        titulo,
        mensagem,
        tipo,
        pathKey,
      });

      // 2. Busca pushToken e preferências do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          pushToken: true,
          notificacoesAtivas: true,
          pushPet: true,
          pushAdocao: true,
          pushClube: true,
          pushNovidades: true,
        },
      });

      // 3. Só o push do celular respeita toggle geral + categoria
      const campo = CAMPO_POR_CATEGORIA[inferirCategoria({ categoria, pathKey, tipo })];
      const categoriaPermite = !campo || user?.[campo] !== false;

      if (user?.pushToken && user.notificacoesAtivas && categoriaPermite) {
        // Sem await: o push é best-effort e não deve atrasar a resposta da API.
        enviarPush(user.pushToken, titulo, mensagem, { pathKey });
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