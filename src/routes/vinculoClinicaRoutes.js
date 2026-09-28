const express = require('express');
const authMiddleware = require('../middlewares/auth');
const vinculoClinicaController = require('../controllers/vinculoClinicaController');

const router = express.Router();

router.use(authMiddleware);

router.get('/:codigo', vinculoClinicaController.consultar);
router.post('/:codigo/confirmar', vinculoClinicaController.confirmar);

module.exports = router;