// src/routes/petRoutes.js
const express = require('express');
const petController = require('../controllers/petController');
const authMiddleware = require('../middlewares/auth');
const uploadController = require('../controllers/uploadPetController');
const { uploadPetPhoto } = require('../middlewares/upload');

const router = express.Router();

router.use(authMiddleware);

router.post('/', petController.create);
router.get('/', petController.listAll);

// --- ROTAS ESTÁTICAS DE VACINAS E DOSES (devem vir ANTES de /:id) ---
router.delete('/vaccines/:vaccineId/doses/:doseId', petController.deleteDose);
router.delete('/vaccines/:id', petController.deleteVaccine);
router.post('/vaccines/:id/doses', petController.addDose);
// ---------------------------------------------------------------------

router.post('/:id/foto', uploadPetPhoto, uploadController.uploadPetPhoto);
router.get('/:id/vaccines', petController.getVaccines);
router.post('/:id/vaccines', petController.addVaccine);

// --- ROTAS GENÉRICAS DE PET (devem vir POR ÚLTIMO) ---
router.get('/:id', petController.show);
router.patch('/:id', petController.update);
router.delete('/:id', petController.delete);

module.exports = router;