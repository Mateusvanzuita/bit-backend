// src/services/bannerService.js
const prisma = require('../config/database');
const { AppError } = require('../middlewares/errorHandler');

class BannerService {
  async createBanner(data) {
    return await prisma.bannerHome.create({
      data: {
        ...data,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null
      }
    });
  }

  async getAllBanners() {
    return await prisma.bannerHome.findMany({
      orderBy: { ordem: 'asc' }
    });
  }

  async updateBanner(id, updateData) {
    const banner = await prisma.bannerHome.findUnique({ where: { id } });
    if (!banner) throw new AppError('Banner não encontrado', 404);

    if (updateData.dataInicio) updateData.dataInicio = new Date(updateData.dataInicio);
    if (updateData.dataFim) updateData.dataFim = new Date(updateData.dataFim);

    return await prisma.bannerHome.update({
      where: { id },
      data: updateData
    });
  }

  async deleteBanner(id) {
    return await prisma.bannerHome.delete({ where: { id } });
  }
}

module.exports = new BannerService();