const prisma = require('../config/database');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return await prisma[this.model].create({ data });
  }

  async findById(id) {
    return await prisma[this.model].findUnique({ where: { id } });
  }

  async findAll(options = {}) {
    return await prisma[this.model].findMany(options);
  }

  async update(id, data) {
    return await prisma[this.model].update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return await prisma[this.model].delete({ where: { id } });
  }

  async count(where = {}) {
    return await prisma[this.model].count({ where });
  }
}

module.exports = BaseRepository;
