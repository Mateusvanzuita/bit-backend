const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/database');

const server = app.listen(config.port, () => {
  console.log(`
🚀 Server is running!
📡 Port: ${config.port}
🌍 Environment: ${config.nodeEnv}
📝 API Documentation: http://localhost:${config.port}/api/v1/health
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});
