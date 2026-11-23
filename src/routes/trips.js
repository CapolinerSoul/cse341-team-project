import { Router } from 'express';
import { bookingPage, processBookingRequest } from './book.js';
import confirmationPage from './confirm.js';
import { requirePageLogin } from '../middleware/auth.js';

const router = Router();

router.get(
  '/booking/:scheduleId',
  requirePageLogin,
  bookingPage
);

router.post(
  '/book',
  requirePageLogin,
  processBookingRequest
);

router.get(
  '/confirmation/:confirmationId',
  requirePageLogin,
  confirmationPage
);

export default router;