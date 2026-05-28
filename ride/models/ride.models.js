const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    captain: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    pickup: { type: String, required: true },
    destination: { type: String, required: true },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true
    }
  },
  { timestamps: true }
);

const Ride = mongoose.model('Ride', rideSchema);

module.exports = Ride;
