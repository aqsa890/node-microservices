const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const rideController = require('../controllers/ride.controllers');

router.post('/create-ride',authMiddleware.userAuth, rideController.createRide);

module.exports = router;
