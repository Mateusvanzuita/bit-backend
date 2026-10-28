require('dotenv').config();
const prisma = require('./src/config/database');
const n = require('./src/services/notificationService');

(async () => {
  const u = await prisma.user.findUnique({ where: { email: 'catarinody@gmail.com' } });
  if (!u) { console.log('Usuário não encontrado'); process.exit(1); }

  await n.notificar(u.id, {
    titulo: 'Teste de clube 🎟️',
    mensagem: 'Notificação da categoria Clube e ofertas.',
    tipo: 'SISTEMA',
    pathKey: '/clube',
  });

  // Espera o push (que roda sem await) terminar antes de encerrar.
  await new Promise((r) => setTimeout(r, 4000));
  console.log('Concluído');
  process.exit(0);
})();
