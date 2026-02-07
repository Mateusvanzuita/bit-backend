// src/controllers/bannerController.js
const bannerService = require('../services/bannerService');
const asyncHandler = require('../utils/asyncHandler');

class BannerController {
  create = asyncHandler(async (req, res) => {
    const banner = await bannerService.createBanner(req.body);
    res.status(201).json({ status: 'success', data: { banner } });
  });

  listAll = asyncHandler(async (req, res) => {
    // Lista todos para o dashboard (ativos e inativos)
    const banners = await bannerService.getAllBanners();
    res.status(200).json({ status: 'success', data: { banners } });
  });

  update = asyncHandler(async (req, res) => {
    const banner = await bannerService.updateBanner(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { banner } });
  });

  delete = asyncHandler(async (req, res) => {
    await bannerService.deleteBanner(req.params.id);
    res.status(204).json({ status: 'success', data: null });
  });
}

module.exports = new BannerController();