const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');

const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 3303;

server.listen(PORT, () => {
  console.log(`Ride service running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err && err.message ? err.message : err);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`${signal} received: shutting down...`);

  server.close(async () => {
    try {
      await mongoose.connection.close(false);
    } catch {
      // ignore
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => process.exit(1), 5000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGUSR2', () => shutdown('SIGUSR2'));
