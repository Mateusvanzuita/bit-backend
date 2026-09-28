const vinculoClinicaService = require('../services/vinculoClinicaService');
const asyncHandler = require('../utils/asyncHandler');

class VinculoClinicaController {
  // GET /vinculo-clinica/:codigo — usuário autenticado do app consulta o código
  consultar = asyncHandler(async (req, res) => {
    const dados = await vinculoClinicaService.consultarCodigo(req.params.codigo);
    res.status(200).json({ status: 'success', data: dados });
  });

  // POST /vinculo-clinica/:codigo/confirmar { petId }
  confirmar = asyncHandler(async (req, res) => {
    const vinculo = await vinculoClinicaService.confirmarVinculo(
      req.params.codigo,
      req.body.petId,
      req.user.id,
    );
    res.status(201).json({ status: 'success', data: { vinculo } });
  });
}

module.exports = new VinculoClinicaController();