import { Router } from 'express';
import railTripsRouter from './trips.js';
import apiRoutes from './api-routes.js';
import ejsRoutes from './ejs-routes.js';
import { trainsApi, trainsPage } from './trains.js';
import { homePage, aboutPage, testErrorPage } from './index.js';
import authRouter from './auth.js';
import { bookingsAdminPage } from '../controllers/bookings.js';
import { tripsAdminPage } from '../controllers/trips.js';
import {
  requireApiLogin,
  requirePageLogin,
  requirePageRole
} from '../middleware/auth.js';

const router = Router();
router.get('/admin', requirePageRole('admin'), (req, res) => {
  res.render('admin', {
    title: 'Admin Dashboard'
  });
});

router.get('/admin/bookings', requirePageLogin, bookingsAdminPage);
router.get('/admin/trips', requirePageRole('admin'), tripsAdminPage);

router.use('/', authRouter);

router.get('/', homePage);
router.get('/about', aboutPage);

router.get('/trains', trainsPage);
router.get('/api/trains', requireApiLogin, trainsApi);

router.use('/api', apiRoutes);
router.use('/', ejsRoutes);
router.use('/trips', railTripsRouter);

router.get('/500', testErrorPage);

export default router;