// src/jobs/expirarCupons.js
//
// Job que roda periodicamente para marcar como EXPIRADO
// os resgates cujo dataFimSnapshot já passou.
//
// Opções de agendamento:
//   A) node-cron (recomendado para começar — sem dependência externa)
//   B) Bull/BullMQ (para escala, com Redis)
//
// Para usar com node-cron:
//   1. npm install node-cron
//   2. Importe e inicie no server.js (veja instruções abaixo)

const cupomResgateRepository = require('../repositories/cupomResgateRepository');

const expirarCuponsJob = async () => {
  try {
    const resultado = await cupomResgateRepository.expirarVencidos();
    if (resultado.count > 0) {
      console.log(`⏰ [ExpirarCupons] ${resultado.count} resgate(s) expirado(s)`);
    }
  } catch (err) {
    console.error('❌ [ExpirarCupons] Erro ao expirar cupons:', err.message);
  }
};

module.exports = expirarCuponsJob;


// ─────────────────────────────────────────────────────────────────────────────
// INSTRUÇÃO DE USO — adicione no server.js, dentro de startServer():
//
//   const cron = require('node-cron');
//   const expirarCuponsJob = require('./jobs/expirarCupons');
//
//   // Roda a cada 15 minutos
//   cron.schedule('*/15 * * * *', expirarCuponsJob);
//   console.log('✅ Job de expiração de cupons agendado');
//
// ─────────────────────────────────────────────────────────────────────────────