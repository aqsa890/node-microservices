const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const morgan = require('morgan');
const app = express();
const userRoutes = require('./routes/user.routes');
const cookieParser = require('cookie-parser');
const connect = require('./db/db');

connect();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));    
app.use(express.json());
app.use(cookieParser());

app.use('/api/users', userRoutes);
module.exports = app;
