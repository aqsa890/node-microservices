const Ride = require('../models/ride.models');
const { publishToQueue } = require('../service/rabbit');

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
      user: req.user.id,
      pickup,
      destination
    });

    // publish an event for other services
    try {
      await publishToQueue('ride.created', { rideId: ride._id, userId: req.user.id, pickup, destination });
    } catch (err) {
      console.error('Failed to publish ride.created event', err && err.message ? err.message : err);
    }

    return res.status(201).json({ message: 'Ride created', ride });
  } catch (error) {
    console.error('createRide error', error && error.message ? error.message : error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports.acceptRide = async (req, res) => {
  try {
    const captain = req.captain;
    if (!captain || !captain.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { rideId } = req.body;
    if (!rideId) {
      return res.status(400).json({ message: 'rideId is required' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.status && ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride not available for acceptance' });
    }

    ride.captain = captain.id;
    ride.status = 'accepted';
    await ride.save();

    try {
      await publishToQueue('ride.accepted', { rideId: ride._id, captainId: captain.id, user: ride.user, pickup: ride.pickup, destination: ride.destination });
    } catch (err) {
      console.error('Failed to publish ride.accepted event', err && err.message ? err.message : err);
    }

    return res.status(200).json({ message: 'Ride accepted', ride });
  } catch (error) {
    console.error('acceptRide error', error && error.message ? error.message : error);
    return res.status(500).json({ message: 'Server error' });
  }
};
