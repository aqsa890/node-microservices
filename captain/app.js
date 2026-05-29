const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const morgan = require('morgan');
const app = express();
const captainRoutes = require('./routes/captain.routes');
const cookieParser = require('cookie-parser');
const connect = require('./db/db');
let rabbitmq;
try {
	rabbitmq = require('./utils/rabbitmq');
	rabbitmq.connect()
		.then(() => {
			console.log('Captain service connected to RabbitMQ');
			// subscribe to ride.created events for asynchronous communication
			try {
				rabbitmq.subscribeToQueue('ride.created', async (data) => {
					console.log('Received ride.created event in Captain:', data);
					// TODO: add domain handling here (assign captain, notify user, etc.)
				})
				.then(() => console.log('Subscribed to ride.created'))
				.catch((err) => console.error('Failed to subscribe to ride.created', err && err.message ? err.message : err));
			} catch (subErr) {
				console.error('Error setting up ride.created subscription', subErr && subErr.message ? subErr.message : subErr);
			}
		})
		.catch((err) => console.error('Captain RabbitMQ connection failed', err && err.message ? err.message : err));
} catch (err) {
	console.warn('RabbitMQ helper not available for Captain service:', err && err.message ? err.message : err);
	rabbitmq = null;
}

connect();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));    
app.use(express.json());
app.use(cookieParser());

app.use('/api/captains', captainRoutes);
module.exports = app;