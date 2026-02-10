const dicaRepository = require('../repositories/dicaRepository');
const petRepository = require('../repositories/petRepository');
const { AppError } = require('../middlewares/errorHandler');

class DicaService {
  async listAllDicas() {
    return await dicaRepository.findAll({ orderBy: { createdAt: 'desc' } });
  }

  async getDicaDetails(id) {
    const dica = await dicaRepository.findFullDica(id);
    if (!dica) throw new AppError('Dica não encontrada', 404);
    return dica;
  }

  async salvarResposta(userId, petId, dicaId, respostas) {
    // Valida se o pet pertence ao usuário logado
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado ou acesso negado', 404);

    // Itera sobre as respostas (etapaId e opcaoId) enviadas pelo App
    const promises = respostas.map(resp => 
      dicaRepository.upsertResposta(petId, dicaId, resp.etapaId, resp.opcaoId)
    );

    return await Promise.all(promises);
  }
}

module.exports = new DicaService();