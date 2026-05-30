// src/jobs/aniversariosJob.js
//
// Roda uma vez por dia às 8h (agendado no server.js).
// Busca todos os pets que fazem aniversário hoje e notifica o tutor.

const petRepository = require('../repositories/petRepository');
const notificationService = require('../services/notificationService');

const aniversariosJob = async () => {
  console.log('🎂 [AniversariosJob] Verificando aniversários do dia...');

  try {
    const aniversariantes = await petRepository.findAniversariantes();

    if (aniversariantes.length === 0) {
      console.log('🎂 [AniversariosJob] Nenhum aniversário hoje.');
      return;
    }

    for (const pet of aniversariantes) {
      try {
        const anos = pet.anos;
        const especie = pet.especie === 'GATO' ? '🐱' : '🐶';

        const titulo = `Feliz aniversário, ${pet.nome}! ${especie}🎂`;

        const mensagem = anos > 0
          ? `${pet.nome} está completando ${anos} ano${anos > 1 ? 's' : ''} hoje! Que tal um mimo especial?`
          : `${pet.nome} está completando 1 aninho hoje! Celebre esse momento especial.`;

        await notificationService.notificar(pet.userId, {
          titulo,
          mensagem,
          tipo: 'SISTEMA',
          pathKey: `/pets/${pet.id}`,
        });

        console.log(`🎂 [AniversariosJob] Notificado: ${pet.nome} (userId: ${pet.userId})`);
      } catch (err) {
        // Não interrompe os demais pets se um falhar
        console.error(`❌ [AniversariosJob] Erro ao notificar pet ${pet.nome}:`, err.message);
      }
    }

    console.log(`🎂 [AniversariosJob] ${aniversariantes.length} notificação(ões) enviada(s).`);
  } catch (err) {
    console.error('❌ [AniversariosJob] Erro geral:', err.message);
  }
};

module.exports = aniversariosJob;