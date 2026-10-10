// src/controllers/adocaoController.js
const adocaoService = require('../services/adocaoService');
const asyncHandler = require('../utils/asyncHandler');

const num = (v) => (v !== undefined && v !== '' ? parseFloat(v) : undefined);

// Lê latitude/longitude/cidade/estado/raioKm da query.
const lerLocalizacao = (q) => ({
  latitude: num(q.latitude),
  longitude: num(q.longitude),
  cidade: q.cidade,
  estado: q.estado,
  raioKm: num(q.raioKm),
});

class AdocaoController {
  // ── ANIMAIS ────────────────────────────────────────────────────────────────

  // GET /adocao/animais
  // Query: especie, porte, faseVida, sexo, ongId, apadrinhaveis, latitude, longitude,
  //        cidade, estado, raioKm, cursor, limite
  listarAnimais = asyncHandler(async (req, res) => {
    const q = req.query;
    const limiteSolicitado = Number.parseInt(q.limite, 10);
    const limite = Number.isFinite(limiteSolicitado) ? Math.min(Math.max(limiteSolicitado, 1), 50) : 10;

    const data = await adocaoService.listarAnimais(req.user.id, {
      ...lerLocalizacao(q),
      especie: q.especie,
      porte: q.porte,
      faseVida: q.faseVida,
      sexo: q.sexo,
      ongId: q.ongId,
      apadrinhaveis: q.apadrinhaveis === 'true',
      cursor: q.cursor,
      limite,
    });
    res.status(200).json({ status: 'success', data });
  });

  // GET /adocao/animais/:id
  detalhesAnimal = asyncHandler(async (req, res) => {
    const animal = await adocaoService.detalhesAnimal(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: { animal } });
  });

  // POST /adocao/animais/:id/denuncias
  denunciarAnimal = asyncHandler(async (req, res) => {
    await adocaoService.denunciarAnimal(req.user.id, req.params.id, req.body);
    res.status(201).json({ status: 'success', data: null });
  });

  // ── ONGs ───────────────────────────────────────────────────────────────────

  // GET /adocao/ongs
  listarOngs = asyncHandler(async (req, res) => {
    const ongs = await adocaoService.listarOngs(lerLocalizacao(req.query));
    res.status(200).json({ status: 'success', data: { ongs } });
  });

  // GET /adocao/ongs/:id
  detalhesOng = asyncHandler(async (req, res) => {
    const ong = await adocaoService.detalhesOng(req.params.id);
    res.status(200).json({ status: 'success', data: { ong } });
  });

  // GET /adocao/ongs/:id/ajuda
  ajudaOng = asyncHandler(async (req, res) => {
    const ajuda = await adocaoService.ajudaOng(req.params.id);
    res.status(200).json({ status: 'success', data: { ajuda } });
  });

  // ── INTERESSES ─────────────────────────────────────────────────────────────

  // POST /adocao/interesses
  demonstrarInteresse = asyncHandler(async (req, res) => {
    const { animalId, respostas, consentimento } = req.body;
    const interesse = await adocaoService.demonstrarInteresse(req.user.id, {
      animalId,
      respostas,
      consentimento,
    });
    res.status(201).json({ status: 'success', data: { interesse } });
  });

  // GET /adocao/interesses/meus
  meusInteresses = asyncHandler(async (req, res) => {
    const interesses = await adocaoService.meusInteresses(req.user.id);
    res.status(200).json({ status: 'success', data: { interesses } });
  });

  // PATCH /adocao/interesses/:id/cancelar
  cancelarInteresse = asyncHandler(async (req, res) => {
    const interesse = await adocaoService.cancelarInteresse(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: { interesse } });
  });

  // PATCH /adocao/interesses/:id/pet
  vincularPet = asyncHandler(async (req, res) => {
    const interesse = await adocaoService.vincularPet(req.user.id, req.params.id, req.body.petId);
    res.status(200).json({ status: 'success', data: { interesse } });
  });

  // ── FAVORITOS ──────────────────────────────────────────────────────────────

  // POST /adocao/favoritos/:animalId
  favoritar = asyncHandler(async (req, res) => {
    const data = await adocaoService.favoritar(req.user.id, req.params.animalId);
    res.status(200).json({ status: 'success', data });
  });

  // DELETE /adocao/favoritos/:animalId
  desfavoritar = asyncHandler(async (req, res) => {
    const data = await adocaoService.desfavoritar(req.user.id, req.params.animalId);
    res.status(200).json({ status: 'success', data });
  });

  // GET /adocao/favoritos
  listarFavoritos = asyncHandler(async (req, res) => {
    const animais = await adocaoService.listarFavoritos(req.user.id);
    res.status(200).json({ status: 'success', data: { animais } });
  });

  // ── ALERTAS ────────────────────────────────────────────────────────────────

  // POST /adocao/alertas
  criarAlerta = asyncHandler(async (req, res) => {
    const alerta = await adocaoService.criarAlerta(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { alerta } });
  });

  // GET /adocao/alertas
  listarAlertas = asyncHandler(async (req, res) => {
    const alertas = await adocaoService.listarAlertas(req.user.id);
    res.status(200).json({ status: 'success', data: { alertas } });
  });

  // DELETE /adocao/alertas/:id
  removerAlerta = asyncHandler(async (req, res) => {
    await adocaoService.removerAlerta(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: null });
  });

  // ── AJUDAS ─────────────────────────────────────────────────────────────────

  // POST /adocao/ajudas
  registrarAjuda = asyncHandler(async (req, res) => {
    const ajuda = await adocaoService.registrarAjuda(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { ajuda } });
  });

  // GET /adocao/ajudas/minhas
  minhasAjudas = asyncHandler(async (req, res) => {
    const ajudas = await adocaoService.minhasAjudas(req.user.id);
    res.status(200).json({ status: 'success', data: { ajudas } });
  });

  // PATCH /adocao/ajudas/:id/cancelar
  cancelarAjuda = asyncHandler(async (req, res) => {
    const ajuda = await adocaoService.cancelarAjuda(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: { ajuda } });
  });
}

module.exports = new AdocaoController();