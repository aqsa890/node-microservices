const express = require('express');
const router = express.Router();
const captainController= require('../controllers/captain.controllers');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', captainController.register);
router.post('/login', captainController.login);
router.get('/logout', captainController.logout);
router.get('/profile', authMiddleware.captainAuth, captainController.profile);
// long-poll endpoint: captain waits for a new ride assignment
router.get('/wait-ride', authMiddleware.captainAuth, captainController.waitForRide);

module.exports =router;