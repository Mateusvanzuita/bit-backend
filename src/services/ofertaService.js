const ofertaRepository = require('../repositories/ofertaRepository');
const { AppError } = require('../middlewares/errorHandler');
const { selecionarPonderado } = require('../utils/rodizioPonderado');

class OfertaService {
  // ── App do tutor ───────────────────────────────────────────

  async listarParaApp({ cidade, estado, destaques = false, limite = 20 }) {
    const ofertas = await ofertaRepository.listarAtivasProximas({
      cidade,
      estado,
      limite: destaques ? 100 : limite,
    });

    const selecionadas = destaques
      ? selecionarPonderado(ofertas, limite)
      : ofertas;

    return selecionadas.map((o) => ({
      id: o.id,
      nome: o.nome,
      fotoUrl: o.fotoUrl,
      preco: o.preco,
      precoOriginal: o.precoOriginal,
      petShop: {
        id: o.petShop.id,
        nome: o.petShop.nome,
        whatsapp: o.petShop.whatsapp,
      },
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
    const pesoDestaque = Number(dados.pesoDestaque ?? 1);

    if (![1, 2].includes(pesoDestaque)) {
      throw new AppError('pesoDestaque deve ser 1 ou 2.', 400);
    }

    return ofertaRepository.criar({
      petShopId,
      ...dados,
      pesoDestaque,
    });
  }

  async atualizar(id, dados) {
    const dadosAtualizacao = { ...dados };

    if (dados.pesoDestaque !== undefined) {
      const pesoDestaque = Number(dados.pesoDestaque);

      if (![1, 2].includes(pesoDestaque)) {
        throw new AppError('pesoDestaque deve ser 1 ou 2.', 400);
      }

      dadosAtualizacao.pesoDestaque = pesoDestaque;
    }

    return ofertaRepository.atualizar(id, dadosAtualizacao);
  }

  async remover(id) {
    await ofertaRepository.remover(id);
  }

  async listarCliques(filtro) {
    return ofertaRepository.listarCliques(filtro);
  }
}

module.exports = new OfertaService();