const amqplib = require('amqplib');

let connectionPromise = null;

function getRabbitUrl() {
	return process.env.RABBIT_URL || 'amqp://localhost';
}

async function getConnection() {
	if (!connectionPromise) {
		console.log('Connecting to RabbitMQ at', getRabbitUrl());
		// store a promise that resolves to an active connection with handlers attached
		connectionPromise = amqplib.connect(getRabbitUrl())
			.then((conn) => {
				// attach handlers so errors/close are logged and we reset the cached promise
				conn.on('error', (err) => {
					console.error('RabbitMQ connection error', err && err.message ? err.message : err);
					connectionPromise = null;
				});
				conn.on('close', () => {
					console.warn('RabbitMQ connection closed');
					connectionPromise = null;
				});
				return conn;
			})
			.catch((err) => {
				connectionPromise = null;
				console.error('RabbitMQ connection error', err && err.message ? err.message : err);
				throw err;
			});
	}
	return connectionPromise;
}

async function publishToQueue(queue, payload, options = {}) {
	// try publish, with one reconnect attempt on failure
	let lastErr;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const conn = await getConnection();
			const ch = await conn.createChannel();
			// attach channel error handler to avoid uncaught channel errors
			ch.on('error', (err) => {
				console.error('RabbitMQ channel error', err && err.message ? err.message : err);
			});
			try {
				await ch.assertQueue(queue, { durable: true });
				const sent = ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
					persistent: true,
					...options,
				});
				return sent;
			} finally {
				try { await ch.close(); } catch (e) { /* ignore */ }
			}
		} catch (err) {
			lastErr = err;
			// if this looks like a connection/socket error, reset cached connection and retry once
			console.error('publishToQueue attempt failed', err && err.message ? err.message : err);
			connectionPromise = null;
			// small delay before retrying
			await new Promise((r) => setTimeout(r, 250));
		}
	}
	// if we get here, both attempts failed
	throw lastErr;
}

async function subscribeToQueue(queue, onMessage, { noAck = false } = {}) {
	const conn = await getConnection();
	const ch = await conn.createChannel();
	// attach channel error handler to avoid uncaught channel errors
	ch.on('error', (err) => {
		console.error('RabbitMQ channel error (consumer)', err && err.message ? err.message : err);
	});
	await ch.assertQueue(queue, { durable: true });

	await ch.consume(queue, async (msg) => {
		if (!msg) return;
		try {
			const content = JSON.parse(msg.content.toString());
			await onMessage(content, msg);
			if (!noAck) ch.ack(msg);
		} catch (err) {
			console.error('Error handling message from', queue, err && err.message ? err.message : err);
			if (!noAck) ch.nack(msg, false, false);
		}
	}, { noAck });

	// return an async function to close channel when consumer should stop
	return async function stop() {
		try { await ch.close(); } catch (e) { /* ignore */ }
	};
}

module.exports = {
	getConnection,
	publishToQueue,
	subscribeToQueue,
};
