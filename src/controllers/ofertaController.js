const ofertaService = require('../services/ofertaService');
const userRepository = require('../repositories/userRepository');
const asyncHandler = require('../utils/asyncHandler');

class OfertaController {
  // GET /api/v1/club/ofertas
  listar = asyncHandler(async (req, res) => {
    const user = await userRepository.findById(req.user.id);

    const destaques = req.query.destaques === 'true';

    const limiteSolicitado = Number.parseInt(req.query.limite, 10);
    const limite = Number.isFinite(limiteSolicitado)
      ? Math.min(Math.max(limiteSolicitado, 1), 20)
      : 20;

    const ofertas = await ofertaService.listarParaApp({
      cidade: user?.cidade,
      estado: user?.estado,
      destaques,
      limite,
    });

    res.status(200).json({ status: 'success', data: { ofertas } });
  });

  // POST /api/v1/club/ofertas/:id/clique
  registrarClique = asyncHandler(async (req, res) => {
    const resultado = await ofertaService.registrarClique(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', data: resultado });
  });
}

module.exports = new OfertaController();