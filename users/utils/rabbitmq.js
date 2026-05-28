const amqplib = require('amqplib');

let connection = null;

function getRabbitUrl() {
  return process.env.RABBIT_URL || 'amqp://localhost';
}

async function connect() {
  if (connection) return connection;
  try {
    connection = await amqplib.connect(getRabbitUrl());
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error', err && err.message ? err.message : err);
      connection = null;
    });
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed');
      connection = null;
    });
    return connection;
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err && err.message ? err.message : err);
    throw err;
  }
}

async function publishToQueue(queue, payload, options = {}) {
  const conn = await connect();
  const ch = await conn.createChannel();
  try {
    await ch.assertQueue(queue, { durable: true });
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true, ...options });
  } finally {
    try { await ch.close(); } catch (e) { /* ignore */ }
  }
}

async function subscribeToQueue(queue, onMessage, { noAck = false } = {}) {
  const conn = await connect();
  const ch = await conn.createChannel();
  await ch.assertQueue(queue, { durable: true });
  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      await onMessage(data, msg);
      if (!noAck) ch.ack(msg);
    } catch (err) {
      console.error('Error processing RabbitMQ message', err && err.message ? err.message : err);
      if (!noAck) ch.nack(msg, false, false);
    }
  }, { noAck });

  return async function stop() {
    try { await ch.close(); } catch (e) { /* ignore */ }
  };
}

module.exports = {
  connect,
  publishToQueue,
  subscribeToQueue,
};
