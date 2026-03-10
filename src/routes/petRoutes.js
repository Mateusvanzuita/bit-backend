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

// --- ROTAS DE VACINAS ---
// Esta é a rota que seu frontend chama no useEffect e que estava faltando (causando o 404)
router.get('/:id/vaccines', petController.getVaccines); 

router.post('/:id/vaccines', petController.addVaccine);
router.post('/vaccines/:id/doses', petController.addDose);
// ------------------------
router.post('/:id/foto', uploadPetPhoto, uploadController.uploadPetPhoto);

router.get('/:id', petController.show);
router.patch('/:id', petController.update);
router.delete('/:id', petController.delete);

module.exports = router;