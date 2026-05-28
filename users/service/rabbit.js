const amqplib = require('amqplib');

let connectionPromise = null;

function getRabbitUrl() {
	return process.env.RABBIT_URL || 'amqp://localhost';
}

async function getConnection() {
	if (!connectionPromise) {
		connectionPromise = amqplib.connect(getRabbitUrl());
		connectionPromise.catch((err) => {
			connectionPromise = null;
			console.error('RabbitMQ connection error', err && err.message ? err.message : err);
		});
	}
    console.log('Connecting to RabbitMQ at', getRabbitUrl());
	return connectionPromise;
}

async function publishToQueue(queue, payload, options = {}) {
	const conn = await getConnection();
	const ch = await conn.createChannel();
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
}

async function subscribeToQueue(queue, onMessage, { noAck = false } = {}) {
	const conn = await getConnection();
	const ch = await conn.createChannel();
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
