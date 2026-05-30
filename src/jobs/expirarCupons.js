// src/jobs/expirarCupons.js
const cupomResgateRepository = require('../repositories/cupomResgateRepository');
const notificationService = require('../services/notificationService');

const expirarCuponsJob = async () => {
  const agora = new Date();

  // ── 1. Expira resgates vencidos ────────────────────────────────────────
  try {
    const resultado = await cupomResgateRepository.expirarVencidos();
    if (resultado.count > 0) {
      console.log(`⏰ [ExpirarCupons] ${resultado.count} resgate(s) expirado(s)`);
    }
  } catch (err) {
    console.error('❌ [ExpirarCupons] Erro ao expirar cupons:', err.message);
  }

  // ── 2. Avisos de vencimento ────────────────────────────────────────────
  // Níveis: 48h → 24h → 4h (flash)
  // Cada nível só dispara uma vez por resgate (campo avisoEnviado)

  const niveis = [
    {
      nivel: '48h',
      de: new Date(agora.getTime() + 47 * 60 * 60 * 1000),
      ate: new Date(agora.getTime() + 48 * 60 * 60 * 1000),
      mensagem: (titulo) => `Você tem 48h para usar seu cupom "${titulo}".`,
    },
    {
      nivel: '24h',
      de: new Date(agora.getTime() + 23 * 60 * 60 * 1000),
      ate: new Date(agora.getTime() + 24 * 60 * 60 * 1000),
      mensagem: (titulo) => `Último dia! Seu cupom "${titulo}" vence hoje.`,
    },
    {
      nivel: '4h',
      de: new Date(agora.getTime() + 3 * 60 * 60 * 1000),
      ate: new Date(agora.getTime() + 4 * 60 * 60 * 1000),
      mensagem: (titulo) => `Apenas 4 horas! Seu cupom "${titulo}" está quase vencendo.`,
    },
  ];

  for (const { nivel, de, ate, mensagem } of niveis) {
    try {
      const resgates = await cupomResgateRepository.findVencendoEm({ de, ate, nivel });

      for (const resgate of resgates) {
        // Notifica e marca aviso — ambos best-effort, não quebra o job
        await notificationService.notificar(resgate.userId, {
          titulo: 'Cupom vencendo em breve ⏳',
          mensagem: mensagem(resgate.cupomTitulo),
          tipo: 'LEMBRETE',
          pathKey: '/clube',
        });

        await cupomResgateRepository.marcarAvisoEnviado(resgate.id, nivel);
      }

      if (resgates.length > 0) {
        console.log(`⏳ [ExpirarCupons] ${resgates.length} aviso(s) de ${nivel} enviado(s)`);
      }
    } catch (err) {
      console.error(`❌ [ExpirarCupons] Erro no aviso ${nivel}:`, err.message);
    }
  }
};

module.exports = expirarCuponsJob;