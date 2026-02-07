// src/routes/dashboardRoutes.js
const express = require('express');
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middlewares/auth');
// const adminMiddleware = require('../middlewares/admin'); // Se você tiver um check de admin

const router = express.Router();

router.use(authMiddleware); 
// router.use(adminMiddleware); // Recomendado proteger apenas para admins

router.route('/banners')
  .get(bannerController.listAll)
  .post(bannerController.create);

router.route('/banners/:id')
  .patch(bannerController.update)
  .delete(bannerController.delete);

module.exports = router;