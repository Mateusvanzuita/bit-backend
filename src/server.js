const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/database');
const cron = require('node-cron');
const expirarCuponsJob = require('./jobs/expirarCupons');
const aniversariosJob = require('./jobs/aniversariosJob');
const clienteSumidoJob  = require('./jobs/clienteSumidoJob');

const startServer = async () => {
  await prisma.$connect();
  console.log('✅ Banco de dados conectado');
  
  cron.schedule('*/15 * * * *', expirarCuponsJob);
  console.log('✅ Job de expiração de cupons agendado');

  // Todo dia às 8h — notifica tutores com pets aniversariantes
  cron.schedule('0 8 * * *', aniversariosJob);
  console.log('✅ Job de aniversários agendado (diário às 8h)');

  // Todo dia às 9h — notifica clientes que sumiram há 30 dias
  cron.schedule('0 9 * * *', clienteSumidoJob);
  console.log('✅ Job de cliente sumido agendado (diário às 9h)');

  const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port} [${config.nodeEnv}]`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION 💥', err.name, err.message);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', async () => {
    console.log('👋 SIGTERM — graceful shutdown');
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', async () => {
    console.log('👋 SIGINT — graceful shutdown');
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  });
};

startServer().catch((err) => {
  console.error('❌ Falha ao iniciar servidor:', err);
  process.exit(1);
});