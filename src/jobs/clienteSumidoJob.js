// src/jobs/clienteSumidoJob.js
//
// Roda uma vez por dia às 9h (agendado no server.js).
// Busca usuários que utilizaram um cupom pela última vez há 30 dias
// e envia uma notificação genérica de recuperação.

const cupomResgateRepository = require('../repositories/cupomResgateRepository');
const notificationService = require('../services/notificationService');

const clienteSumidoJob = async () => {
  console.log('😢 [ClienteSumidoJob] Verificando clientes sumidos...');

  try {
    const clientes = await cupomResgateRepository.findClientesSumidos(30);

    if (clientes.length === 0) {
      console.log('😢 [ClienteSumidoJob] Nenhum cliente sumido hoje.');
      return;
    }

    for (const cliente of clientes) {
      try {
        await notificationService.notificar(cliente.userId, {
          titulo: 'Sentimos sua falta! 🐾',
          mensagem: 'Faz um tempinho que você não aproveita os cupons do Bitzy Club. Volte e confira as novidades!',
          tipo: 'SISTEMA',
          pathKey: '/clube',
        });

        console.log(`😢 [ClienteSumidoJob] Notificado userId: ${cliente.userId} (último uso: ${cliente.ultimoUso})`);
      } catch (err) {
        console.error(`❌ [ClienteSumidoJob] Erro ao notificar userId ${cliente.userId}:`, err.message);
      }
    }

    console.log(`😢 [ClienteSumidoJob] ${clientes.length} cliente(s) notificado(s).`);
  } catch (err) {
    console.error('❌ [ClienteSumidoJob] Erro geral:', err.message);
  }
};

module.exports = clienteSumidoJob;