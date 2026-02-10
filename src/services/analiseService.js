const analiseRepository = require('../repositories/analiseRepository');
const petRepository = require('../repositories/petRepository');
const { AppError } = require('../middlewares/errorHandler');

class AnaliseService {
  async listAllAnalises() {
    return await analiseRepository.findAll({ orderBy: { createdAt: 'desc' } });
  }

  async getAnaliseDetails(id) {
    const analise = await analiseRepository.findFullAnalise(id);
    if (!analise) throw new AppError('Análise não encontrada', 404);
    return analise;
  }

  async salvarAnaliseCompleta(userId, petId, analiseId, respostas) {
    // 1. Validação de segurança: o pet é do usuário?
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado ou acesso negado', 404);

    // 2. Criar o registro de histórico (AnaliseHistorico)
    const historico = await analiseRepository.createHistorico(petId, analiseId);

    // 3. Salvar todas as respostas vinculadas a este histórico
    const promises = respostas.map(resp => 
      analiseRepository.createResposta({
        historicoId: historico.id,
        etapaId: resp.etapaId,
        opcaoId: resp.opcaoId || null,
        texto: resp.texto || null,
        fotoUrl: resp.fotoUrl || null
      })
    );

    await Promise.all(promises);
    return historico;
  }
}

module.exports = new AnaliseService();