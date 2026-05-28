const Ride = require('../models/ride.models');

module.exports.createRide = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { pickup, destination } = req.body;
    if (!pickup || !destination) {
      return res.status(400).json({ message: 'pickup and destination are required' });
    }

    const ride = await Ride.create({
      userId: req.user.id,
      pickup,
      destination
    });

    return res.status(201).json({ message: 'Ride created', ride });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
  await newRide.save();
};
