const express = require('express');
const router = express.Router();

const bookingController = require('./controllers/controllersbookingController');
const authController = require('./controllers/contollersuserContollers');
const lineLoginController = require('./controllers/lineLoginController');
// --------------------------
// Booking Routes
// --------------------------
router.get('/booking-all', bookingController.getBookings);
router.post('/booking', bookingController.createBooking);
router.get('/booking/user/:userId', bookingController.getUserBookings);
router.post('/booking/manageQueues', bookingController.manageQueues);
router.post('/booking/all-reset', bookingController.resetAllQueues);
router.get('/booking/available-slots', bookingController.getAvailableSlots);
router.post('/booking/daily-reset', bookingController.resetDailyQueues);
router.post('/booking/update-queue', bookingController.manageQueues);
router.get('/booking/next-queue', bookingController.getNextQueue);
router.post('/booking/check-in', bookingController.checkInBooking);
router.get('/booking/generate-qrcode/:bookingId', bookingController.generateBookingQRCode);
router.get('/booking/check-in/:bookingId', bookingController.checkInWithQRCode);
router.get('/booking/check-in/queue/:queueNumber', bookingController.checkInWithQueueNumber);
router.post('/booking/cancel/:bookingId', bookingController.cancelBooking);

// --------------------------
// Auth Routes
// --------------------------
router.get('/authen/gen', authController.generatePublicToken);
router.post('/authen/register', authController.register);
router.post('/authen/login', authController.login);
router.post('/authen/oauth', authController.oauth);
router.post('/online/login', authController.onlineLogin);
router.post('/online/new-password', authController.newPassword);
router.post('/line/login', lineLoginController.lineLogin);
router.get('/authen/verify-token', authController.verifyToken);  
// --------------------------
router.post('/link-line-account', lineLoginController.linkLineAccount);
router.get("/line/callback", lineLoginController.lineCallback); 


// --------------------------
// User Routes
// --------------------------
router.get('/user/profile', authController.getUserProfile);;

module.exports = router;
