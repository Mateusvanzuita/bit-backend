// src/controllers/petController.js
const petService = require('../services/petService');
const asyncHandler = require('../utils/asyncHandler');

class PetController {
  create = asyncHandler(async (req, res) => {
    const pet = await petService.createPet(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { pet } });
  });

  listAll = asyncHandler(async (req, res) => {
    const pets = await petService.getAllPets(req.user.id);
    res.status(200).json({ status: 'success', data: { pets } });
  });

  show = asyncHandler(async (req, res) => {
    const pet = await petService.getPetById(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', data: { pet } });
  });

  update = asyncHandler(async (req, res) => {
    const pet = await petService.updatePet(req.params.id, req.user.id, req.body);
    res.status(200).json({ status: 'success', data: { pet } });
  });

  delete = asyncHandler(async (req, res) => {
    await petService.deletePet(req.params.id, req.user.id);
    res.status(204).json({ status: 'success', data: null });
  });
}

module.exports = new PetController();