const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');

const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 3302;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err && err.message ? err.message : err);
    process.exit(1);
});

function shutdown(signal) {
    console.log(`${signal} received: shutting down...`);

    // Stop accepting new connections.
    server.close(async () => {
        try {
            await mongoose.connection.close(false);
        } catch {
            // ignore
        } finally {
            process.exit(0);
        }
    });

    // Force exit if graceful shutdown stalls.
    setTimeout(() => process.exit(1), 5000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
// nodemon uses SIGUSR2 on restart
process.once('SIGUSR2', () => shutdown('SIGUSR2'));