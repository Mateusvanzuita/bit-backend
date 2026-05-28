const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/database');
const cron = require('node-cron');
const expirarCuponsJob = require('./jobs/expirarCupons');

const startServer = async () => {
  await prisma.$connect();
  console.log('✅ Banco de dados conectado');
  cron.schedule('*/15 * * * *', expirarCuponsJob);
  console.log('✅ Job de expiração de cupons agendado');

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