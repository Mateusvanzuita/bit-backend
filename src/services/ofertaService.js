const ofertaRepository = require('../repositories/ofertaRepository');
const { AppError } = require('../middlewares/errorHandler');

class OfertaService {
  // ── App do tutor ───────────────────────────────────────────

  async listarParaApp({ cidade, estado }) {
    const ofertas = await ofertaRepository.listarAtivasProximas({ cidade, estado });
    return ofertas.map((o) => ({
      id: o.id,
      nome: o.nome,
      fotoUrl: o.fotoUrl,
      preco: o.preco,
      precoOriginal: o.precoOriginal,
      petShop: { id: o.petShop.id, nome: o.petShop.nome, whatsapp: o.petShop.whatsapp },
    }));
  }

  async registrarClique(ofertaId, userId) {
    const oferta = await ofertaRepository.buscarPorId(ofertaId);
    if (!oferta) throw new AppError('Oferta não encontrada', 404);

    // req.user vem só do payload do JWT (id, email...) — busca o registro
    // completo para pegar cidade/estado atuais do perfil, usados como
    // snapshot no momento do clique.
    const userRepository = require('../repositories/userRepository');
    const user = await userRepository.findById(userId);

    await ofertaRepository.registrarClique({
      ofertaId: oferta.id,
      userId,
      petShopId: oferta.petShop.id,
      petShopNome: oferta.petShop.nome,
      ofertaNome: oferta.nome,
      cidadeSnapshot: user?.cidade ?? null,
      estadoSnapshot: user?.estado ?? null,
    });

    return { whatsapp: oferta.petShop.whatsapp || oferta.petShop.telefone };
  }

  // ── Admin (via internal) ──────────────────────────────────

  async listarDoPetShop(petShopId) {
    return ofertaRepository.listarDoPetShop(petShopId);
  }

  async criar(petShopId, dados) {
    return ofertaRepository.criar({ petShopId, ...dados });
  }

  async atualizar(id, dados) {
    return ofertaRepository.atualizar(id, dados);
  }

  async remover(id) {
    await ofertaRepository.remover(id);
  }

  async listarCliques(filtro) {
    return ofertaRepository.listarCliques(filtro);
  }
}

module.exports = new OfertaService();