// src/services/adminService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const adminRepository = require('../repositories/adminRepository');
const petShopRepository = require('../repositories/petShopRepository');
const notificationService = require('./notificationService');
const { AppError } = require('../middlewares/errorHandler');
const config = require('../config/env');

class AdminService {

  // ── AUTH ──────────────────────────────────────────────────────────────────

  async login(email, password) {
    const admin = await adminRepository.findByEmail(email.toLowerCase().trim());

    // Mensagem genérica para evitar enumeração
    const errCredenciais = new AppError('E-mail ou senha incorretos.', 401);

    if (!admin || !admin.ativo) throw errCredenciais;

    const senhaValida = await bcrypt.compare(password, admin.senha);
    if (!senhaValida) throw errCredenciais;

    // Token com type:'admin' para distinguir de tokens de usuário
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, type: 'admin' },
      config.jwt.secret,
      { expiresIn: '8h' },
    );

    return {
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        role: admin.role,
      },
      token,
    };
  }

  async criarAdmin(dados, adminRequisitante) {
    // Apenas SUPER_ADMIN pode criar outros admins
    if (adminRequisitante.role !== 'SUPER_ADMIN') {
      throw new AppError('Apenas SUPER_ADMIN pode criar novos admins.', 403);
    }

    const existente = await adminRepository.findByEmail(dados.email.toLowerCase().trim());
    if (existente) throw new AppError('E-mail já em uso.', 409);

    const senha = await bcrypt.hash(dados.password, 12);

    return await prisma.admin.create({
      data: {
        nome: dados.nome,
        email: dados.email.toLowerCase().trim(),
        senha,
        role: dados.role || 'EDITOR',
      },
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });
  }

  // ── MÉTRICAS ──────────────────────────────────────────────────────────────

  async getMetrics() {
    const agora = new Date();
    const inicio30Dias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);

    // Executa todas as queries em paralelo para minimizar latência
    const [
      totalUsuarios,
      usuariosUltimos30Dias,
      usuariosComPets,
      totalPets,
      petsPorEspecie,
      totalPetShops,
      petShopsAtivos,
      petShopsComPlano,
      totalCupons,
      cuponsAtivos,
      totalResgates,
      resgatesAtivos,
      resgatesUtilizados,
      resgatesExpirados,
      resgatesPorMes,
      topPetShops,
      totalSosAtendimentos,
      sosUltimos30Dias,
    ] = await Promise.all([
      // Usuários
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: inicio30Dias } } }),
      prisma.user.count({ where: { pets: { some: {} } } }),

      // Pets
      prisma.pet.count(),
      prisma.pet.groupBy({ by: ['especie'], _count: { id: true } }),

      // Pet Shops
      prisma.petShop.count(),
      prisma.petShop.count({ where: { ativo: true } }),
      prisma.petShop.count({ where: { ativo: true, planoAtivo: true } }),

      // Cupons
      prisma.cupom.count(),
      prisma.cupom.count({ where: { ativo: true } }),

      // Resgates
      prisma.cupomResgate.count(),
      prisma.cupomResgate.count({ where: { status: 'ATIVO' } }),
      prisma.cupomResgate.count({ where: { status: 'UTILIZADO' } }),
      prisma.cupomResgate.count({ where: { status: 'EXPIRADO' } }),

      // Resgates por mês (últimos 6 meses)
      prisma.$queryRaw`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "resgatadoEm"), 'YYYY-MM') AS mes,
          COUNT(*)::int AS total
        FROM cupom_resgates
        WHERE "resgatadoEm" >= NOW() - INTERVAL '6 months'
        GROUP BY mes
        ORDER BY mes ASC
      `,

      // Top 5 pet shops por resgates
      prisma.$queryRaw`
        SELECT
          cr."petShopId",
          cr."petShopNome",
          COUNT(*)::int AS totalResgates,
          COUNT(CASE WHEN cr.status = 'UTILIZADO' THEN 1 END)::int AS totalUtilizados
        FROM cupom_resgates cr
        GROUP BY cr."petShopId", cr."petShopNome"
        ORDER BY totalResgates DESC
        LIMIT 5
      `,

      // SOS Atendimentos
      prisma.sosAtendimento.count(),
      prisma.sosAtendimento.count({ where: { createdAt: { gte: inicio30Dias } } }),
    ]);

    // Crescimento de usuários por mês (últimos 6 meses)
    const crescimentoUsuarios = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS mes,
        COUNT(*)::int AS total
      FROM users
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY mes
      ORDER BY mes ASC
    `;

    // Cupons por categoria
    const cuponsPorCategoria = await prisma.cupom.groupBy({
      by: ['categoria'],
      where: { ativo: true },
      _count: { id: true },
    });

    return {
      usuarios: {
        total: totalUsuarios,
        ultimos30Dias: usuariosUltimos30Dias,
        comPets: usuariosComPets,
        semPets: totalUsuarios - usuariosComPets,
      },
      pets: {
        total: totalPets,
        porEspecie: Object.fromEntries(
          petsPorEspecie.map((p) => [p.especie, p._count.id]),
        ),
      },
      petShops: {
        total: totalPetShops,
        ativos: petShopsAtivos,
        comPlano: petShopsComPlano,
        semPlano: petShopsAtivos - petShopsComPlano,
      },
      cupons: {
        total: totalCupons,
        ativos: cuponsAtivos,
        porCategoria: Object.fromEntries(
          cuponsPorCategoria.map((c) => [c.categoria, c._count.id]),
        ),
      },
      resgates: {
        total: totalResgates,
        ativos: resgatesAtivos,
        utilizados: resgatesUtilizados,
        expirados: resgatesExpirados,
        porMes: resgatesPorMes,
      },
      sos: {
        total: totalSosAtendimentos,
        ultimos30Dias: sosUltimos30Dias,
      },
      topPetShops,
      crescimentoUsuarios,
    };
  }

  // ── USUÁRIOS ──────────────────────────────────────────────────────────────

  async listarUsuarios({ page = 1, limit = 20, search }) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { nome: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [usuarios, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          nome: true,
          email: true,
          cidade: true,
          estado: true,
          createdAt: true,
          notificacoesAtivas: true,
          _count: {
            select: {
              pets: true,
              cupomResgates: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      usuarios,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async detalhesUsuario(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        sexo: true,
        dataNascimento: true,
        avatar: true,
        cidade: true,
        estado: true,
        pais: true,
        createdAt: true,
        notificacoesAtivas: true,
        pets: {
          select: {
            id: true,
            nome: true,
            especie: true,
            raca: true,
            sexo: true,
            dataNascimento: true,
          },
        },
        cupomResgates: {
          select: {
            id: true,
            status: true,
            cupomTitulo: true,
            petShopNome: true,
            resgatadoEm: true,
            utilizadoEm: true,
          },
          orderBy: { resgatadoEm: 'desc' },
          take: 10,
        },
        petShopFavorito: {
          select: {
            petShop: { select: { id: true, nome: true } },
            descontoSnapshot: true,
            favoritadoEm: true,
          },
        },
      },
    });

    if (!user) throw new AppError('Usuário não encontrado.', 404);
    return user;
  }

  // ── PET SHOPS ─────────────────────────────────────────────────────────────

  async listarPetShops() {
    const petShops = await petShopRepository.findAllAdmin();
    return { petShops, total: petShops.length };
  }

  // ── SOS PROMPT ────────────────────────────────────────────────────────────

  async getSosPromptAtivo() {
    const prompt = await prisma.sosPrompt.findFirst({
      where: { ativo: true },
      orderBy: { createdAt: 'desc' },
    });
    return prompt;
  }

  async listarVersoesPrompt() {
    return await prisma.sosPrompt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        ativo: true,
        createdAt: true,
        admin: { select: { nome: true, email: true } },
        // Retorna só os primeiros 200 chars para preview na listagem
        conteudo: true,
      },
    });
  }

  async salvarSosPrompt(conteudo, adminId) {
    // Usa transaction para desativar o anterior e ativar o novo atomicamente
    return await prisma.$transaction(async (tx) => {
      await tx.sosPrompt.updateMany({
        where: { ativo: true },
        data: { ativo: false },
      });

      return await tx.sosPrompt.create({
        data: { conteudo, adminId, ativo: true },
      });
    });
  }

  async ativarVersaoPrompt(promptId, adminId) {
    const prompt = await prisma.sosPrompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new AppError('Versão do prompt não encontrada.', 404);

    return await prisma.$transaction(async (tx) => {
      await tx.sosPrompt.updateMany({ where: { ativo: true }, data: { ativo: false } });
      return await tx.sosPrompt.update({
        where: { id: promptId },
        data: { ativo: true },
      });
    });
  }

  // ── NOTIFICAÇÃO BROADCAST ─────────────────────────────────────────────────

  async broadcastNotificacao({ titulo, mensagem, tipo = 'SISTEMA', pathKey, filtro }) {
    // filtro: { comPets: bool, cidade: string, estado: string }
    const where = {};

    if (filtro?.comPets) {
      where.pets = { some: {} };
    }
    if (filtro?.cidade) {
      where.cidade = { contains: filtro.cidade, mode: 'insensitive' };
    }
    if (filtro?.estado) {
      where.estado = filtro.estado.toUpperCase();
    }

    where.notificacoesAtivas = true;

    const usuarios = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    // Notifica em lotes de 100 para não explodir a memória
    const BATCH = 100;
    let enviados = 0;

    for (let i = 0; i < usuarios.length; i += BATCH) {
      const lote = usuarios.slice(i, i + BATCH);
      await Promise.allSettled(
        lote.map((u) =>
          notificationService.notificar(u.id, { titulo, mensagem, tipo, pathKey }),
        ),
      );
      enviados += lote.length;
    }

    return { enviados, total: usuarios.length };
  }

  async atualizarPetShop(id, dados) {
    const petShop = await petShopRepository.findById(id);
    if (!petShop) throw new AppError('Pet shop não encontrado.', 404);

    const dataUpdate = { ...dados };
    if (dataUpdate.estado) dataUpdate.estado = dataUpdate.estado.toUpperCase();

    return await petShopRepository.atualizar(id, dataUpdate);
  }

  async deletarPetShop(id) {
    const petShop = await petShopRepository.findById(id);
    if (!petShop) throw new AppError('Pet shop não encontrado.', 404);

    await petShopRepository.deletar(id);
    return { deletado: true };
  }
}

module.exports = new AdminService();
