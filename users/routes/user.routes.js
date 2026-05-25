const express = require('express');
const router = express.Router();
const userController= require('../controllers/user.controllers');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.get('/logout', userController.logout);
router.get('/profile', authMiddleware.userAuth, userController.profile);

module.exports =router;