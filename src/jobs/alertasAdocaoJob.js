// src/jobs/alertasAdocaoJob.js
// "Avise-me quando chegar um assim": compara animais recém-publicados com os alertas
// salvos e notifica o usuário (no máximo 1 notificação por alerta a cada execução).
const prisma = require('../config/database');
const notificationService = require('../services/notificationService');

const alertasAdocaoJob = async () => {
  try {
    const alertas = await prisma.alertaAdocao.findMany();
    let enviados = 0;

    for (const alerta of alertas) {
      // Só animais publicados DEPOIS do último aviso (ou da criação do alerta).
      const desde = alerta.ultimoAvisoEm ?? alerta.createdAt;

      const ong = { ativa: true };
      if (alerta.cidade) {
        ong.cidade = { equals: alerta.cidade, mode: 'insensitive' };
        if (alerta.estado) ong.estado = alerta.estado;
      } else if (alerta.estado) {
        ong.estado = alerta.estado;
      }

      const where = {
        publicado: true,
        status: 'DISPONIVEL',
        publicadoEm: { gt: desde },
        ong,
      };
      if (alerta.especie) where.especie = alerta.especie;
      if (alerta.porte) where.porte = alerta.porte;
      if (alerta.faseVida) where.faseVida = alerta.faseVida;
      if (alerta.sexo) where.sexo = alerta.sexo;

      const novos = await prisma.animalAdocao.findMany({
        where,
        select: { id: true, nome: true },
        orderBy: { publicadoEm: 'desc' },
        take: 10,
      });
      if (novos.length === 0) continue;

      const unico = novos.length === 1;
      await notificationService.notificar(alerta.userId, {
        titulo: unico ? `${novos[0].nome} acabou de chegar! 🐾` : `${novos.length} novos amigos para adotar 🐾`,
        mensagem: unico
          ? 'Combina com o alerta que você criou. Venha conhecer.'
          : 'Combinam com o alerta que você criou. Venha conhecer.',
        tipo: 'SISTEMA',
        pathKey: unico ? `/adocao/animal/${novos[0].id}` : '/adocao',
      });

      await prisma.alertaAdocao.update({
        where: { id: alerta.id },
        data: { ultimoAvisoEm: new Date() },
      });
      enviados++;
    }

    if (enviados > 0) console.log(`🔔 [AlertasAdocao] ${enviados} alerta(s) notificado(s)`);
  } catch (err) {
    console.error('❌ [AlertasAdocao] Erro no job:', err.message);
  }
};

module.exports = alertasAdocaoJob;