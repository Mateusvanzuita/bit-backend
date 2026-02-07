const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class PostRepository extends BaseRepository {
  constructor() {
    super('post');
  }

  async findAllWithAuthor(options = {}) {
    return await prisma.post.findMany({
      ...options,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findByIdWithAuthor(id) {
    return await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findByAuthor(authorId) {
    return await prisma.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

module.exports = new PostRepository();
