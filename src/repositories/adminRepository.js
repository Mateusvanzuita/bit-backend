// src/repositories/adminRepository.js
const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class AdminRepository extends BaseRepository {
  constructor() {
    super('admin');
  }

  async findByEmail(email) {
    return await prisma.admin.findUnique({ where: { email } });
  }

  async findAllAdmin() {
  return await prisma.petShop.findMany({
    select: {
      id: true,
      nome: true,
      descricao: true,
      logoUrl: true,
      bannerUrl: true,
      endereco: true,
      cidade: true,
      estado: true,
      pais: true,
      latitude: true,
      longitude: true,
      telefone: true,
      whatsapp: true,
      instagram: true,
      website: true,
      ativo: true,
      planoAtivo: true,
      planoInicioEm: true,
      planoFimEm: true,
      descontoFavorito: true,
      limiteCuponsAtivos: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          seguidores: true,
          favoritos: true,
          cupons: { where: { ativo: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

  async findByIdSafe(id) {
    return await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
      },
    });
  }

  async listAll() {
    return await prisma.admin.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

module.exports = new AdminRepository();
