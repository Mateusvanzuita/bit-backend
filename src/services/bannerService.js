// src/services/bannerService.js
const prisma = require('../config/database');
const cache = require('../utils/cache');
const { AppError } = require('../middlewares/errorHandler');

const CACHE_KEY = 'banners:home';
const CACHE_TTL = 30 * 60; // 30 minutos

class BannerService {
  async createBanner(data) {
    const banner = await prisma.bannerHome.create({
      data: {
        ...data,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
      },
    });

    await cache.del(CACHE_KEY); // invalida cache ao criar
    return banner;
  }

  async getAllBanners() {
    const cached = await cache.get(CACHE_KEY);
    if (cached) {
      console.log('🟢 Banners: retornado do cache');
      return cached;
    }

    console.log('🔵 Banners: buscando do banco...');
    const banners = await prisma.bannerHome.findMany({
      orderBy: { ordem: 'asc' },
    });

    await cache.set(CACHE_KEY, banners, CACHE_TTL);
    return banners;
  }

  async updateBanner(id, updateData) {
    const banner = await prisma.bannerHome.findUnique({ where: { id } });
    if (!banner) throw new AppError('Banner não encontrado', 404);

    if (updateData.dataInicio) updateData.dataInicio = new Date(updateData.dataInicio);
    if (updateData.dataFim) updateData.dataFim = new Date(updateData.dataFim);

    const updated = await prisma.bannerHome.update({
      where: { id },
      data: updateData,
    });

    await cache.del(CACHE_KEY); // invalida cache ao editar
    return updated;
  }

  async deleteBanner(id) {
    const deleted = await prisma.bannerHome.delete({ where: { id } });

    await cache.del(CACHE_KEY); // invalida cache ao deletar
    return deleted;
  }
}

module.exports = new BannerService();