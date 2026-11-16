import { Router } from 'express';
import { bookingPage, processBookingRequest } from './book.js';
import confirmationPage from './confirm.js';

const router = Router();

router.get('/booking/:scheduleId', bookingPage);
router.post('/book', processBookingRequest);
router.get('/confirmation/:confirmationId', confirmationPage);

export default router;