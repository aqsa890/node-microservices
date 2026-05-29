const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const morgan = require('morgan');
const app = express();
const userRoutes = require('./routes/user.routes');
const cookieParser = require('cookie-parser');
const connect = require('./db/db');
let rabbitmq;
try {
	rabbitmq = require('./utils/rabbitmq');
	// attempt connection but don't let failure crash the whole app
	rabbitmq.connect()
		.then(() => console.log('Users service connected to RabbitMQ'))
		.catch((err) => console.error('Users RabbitMQ connection failed', err && err.message ? err.message : err));
} catch (err) {
	console.warn('RabbitMQ helper not available for Users service:', err && err.message ? err.message : err);
	rabbitmq = null;
}

connect();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));    
app.use(express.json());
app.use(cookieParser());

app.use('/api/users', userRoutes);
module.exports = app;