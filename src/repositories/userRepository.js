const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class UserRepository extends BaseRepository {
  constructor() {
    super('user');
  }

  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async findByIdWithPosts(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        posts: true,
      },
    });
  }

async createUser(data) {
  return await prisma.user.create({
    data: data, // Agora o 'data' já contém 'nome', 'senha', etc.
    select: {
      id: true,
      email: true,
      nome: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
async update(id, data) {
  return await prisma.user.update({
    where: { id },
    data,
    select: { // Retorna o usuário sem a senha por segurança
      id: true,
      email: true,
      nome: true,
      sexo: true,
      dataNascimento: true,
      avatar: true,
    }
  });
}

async delete(id) {
  return await prisma.user.delete({
    where: { id },
  });
}
}

module.exports = new UserRepository();
