const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connect = require('./db/db');
const rideRoutes = require('./routes/ride.routes');

dotenv.config({ path: path.join(__dirname, '.env') });

const rabbit = require('./service/rabbit');

rabbit.getConnection()
	.then(() => console.log('Ride service connected to RabbitMQ'))
	.catch((err) => console.error('Ride RabbitMQ connection failed', err && err.message ? err.message : err));

const app = express();

app.all('/', (req, res) => {
	return res.status(404).json({ message: 'Not found' });
});

connect();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());



app.use('/api/rides', rideRoutes);

module.exports = app;
