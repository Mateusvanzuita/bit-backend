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
}

module.exports = new UserRepository();
