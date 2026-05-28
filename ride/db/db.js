const mongoose = require('mongoose');

function connect() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;
  if (!mongoUri) {
    console.error('Missing MongoDB connection string. Set MONGO_URI or MONGO_URL in the environment.');
    return;
  }

  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error('Error connecting to MongoDB', err && err.message ? err.message : err);
      setTimeout(connect, 5000);
    });
}

module.exports = connect;
