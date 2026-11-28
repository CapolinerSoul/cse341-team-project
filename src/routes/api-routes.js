import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import {
    getAllTrips,
    getTripById,
    updateTrip,
    deleteTrip,
    getAllStations
} from '../controllers/trips.js';
import {
    getSchedulesForTrip,
    getSchedulesForTripAndMonth
} from '../controllers/schedules.js';
import {
    getBookings,
    updateBooking,
    deleteBooking
} from '../controllers/bookings.js';
import {
    requireApiLogin,
    requireApiRole
} from '../middleware/auth.js';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Trip:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: alpine-panorama
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         region:
 *           type: string
 *         startStation:
 *           type: string
 *         endStation:
 *           type: string
 *         duration:
 *           type: string
 *         distance:
 *           type: number
 *         highlights:
 *           type: array
 *           items:
 *             type: string
 *         bestSeason:
 *           type: string
 *         operatingMonths:
 *           type: array
 *           items:
 *             type: integer
 *             minimum: 1
 *             maximum: 12
 *         imageUrl:
 *           type: string
 *     Passenger:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: JRA1B2C3DE
 *         createdAt:
 *           type: string
 *           format: date-time
 *         scheduleId:
 *           type: string
 *         tripId:
 *           type: string
 *         ticketClass:
 *           type: string
 *           example: standard
 *         selectedDay:
 *           type: string
 *           example: monday
 *         passengers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Passenger'
 *     Station:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: nagoya
 *         name:
 *           type: string
 *         prefecture:
 *           type: string
 *         region:
 *           type: string
 *         facilities:
 *           type: array
 *           items:
 *             type: string
 *         description:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @openapi
 * /api/trips:
 *   get:
 *     summary: Get trips with optional pagination and filtering
 *     tags:
 *       - Trips
 *     description: |
 *       Providing page, region, season, or search returns paginated results.
 *       Filters are combined and applied before pagination.
 *       Without these parameters, returns the complete trip list.
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Positive page number. Defaults to 1 for filtered requests.
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: region
 *         description: Exact region value, or all. Unknown values return no matches.
 *         schema:
 *           type: string
 *           maxLength: 100
 *         example: central
 *       - in: query
 *         name: season
 *         description: Exact best-season value, or all. Unknown values return no matches.
 *         schema:
 *           type: string
 *           maxLength: 100
 *         example: autumn
 *       - in: query
 *         name: search
 *         description: Case-insensitive literal substring search in trip names, descriptions, or regions. Surrounding whitespace is trimmed.
 *         schema:
 *           type: string
 *           maxLength: 200
 *         example: mountain
 *     responses:
 *       '200':
 *         description: |
 *           Trip results. Paginated responses also include pagination,
 *           available filter options, and the applied query.
 *           Page size is 10. Requests beyond the last page return the
 *           last available page. Empty results return page 1 and zero total pages.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trips:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       minimum: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       minimum: 0
 *                     totalPages:
 *                       type: integer
 *                       minimum: 0
 *                 filters:
 *                   type: object
 *                   description: Available options from all trips.
 *                   properties:
 *                     regions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     seasons:
 *                       type: array
 *                       items:
 *                         type: string
 *                 query:
 *                   type: object
 *                   description: Applied filters after trimming whitespace.
 *                   properties:
 *                     region:
 *                       type: string
 *                       example: central
 *                     season:
 *                       type: string
 *                       example: autumn
 *                     search:
 *                       type: string
 *                       example: mountain
 *       '400':
 *         description: Invalid page, repeated parameters, or invalid filter types or lengths.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Failed to fetch trips.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trips', getAllTrips);

/**
 * @openapi
 * /api/trips/{id}:
 *   get:
 *     summary: Get one trip by its string ID
 *     tags:
 *       - Trips
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The trip slug, rather than its MongoDB _id.
 *         schema:
 *           type: string
 *           example: alpine-panorama
 *     responses:
 *       '200':
 *         description: The requested trip.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trip'
 *       '404':
 *         description: Trip not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Failed to fetch trip.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trips/:id', getTripById);

/**
 * @openapi
 * /api/trips/{id}:
 *   put:
 *     summary: Update a trip (admin only)
 *     tags:
 *       - Trips
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: alpine-panorama
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       '200':
 *         description: The updated trip.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trip'
 *       '400':
 *         description: No valid trip fields were provided.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Admin role required.
 *       '404':
 *         description: Trip not found.
 *       '500':
 *         description: Failed to update trip.
 */
router.put('/trips/:id', requireApiRole('admin'), updateTrip);

/**
 * @openapi
 * /api/trips/{id}:
 *   delete:
 *     summary: Delete a trip (admin only)
 *     tags:
 *       - Trips
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: alpine-panorama
 *     responses:
 *       '204':
 *         description: Trip deleted.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Admin role required.
 *       '404':
 *         description: Trip not found.
 *       '500':
 *         description: Failed to delete trip.
 */
router.delete('/trips/:id', requireApiRole('admin'), deleteTrip);

/**
 * @openapi
 * /api/stations:
 *   get:
 *     summary: Get all stations
 *     tags:
 *       - Stations
 *     responses:
 *       '200':
 *         description: All stations; an empty array when none exist.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Station'
 *       '500':
 *         description: Failed to fetch stations.
 */
router.get('/stations', getAllStations);

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     summary: Get bookings for the signed-in user (admins see all bookings)
 *     tags:
 *       - Bookings
 *     responses:
 *       '200':
 *         description: >
 *           All bookings when the user is an admin; otherwise the bookings
 *           where the user's email matches one of the passengers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       '401':
 *         description: Authentication required.
 *       '500':
 *         description: Failed to fetch bookings.
 */
router.get('/bookings', requireApiLogin, getBookings);

/**
 * @openapi
 * /api/bookings/{id}:
 *   put:
 *     summary: Update a booking (admin, or a passenger on the booking)
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The booking confirmation code.
 *         schema:
 *           type: string
 *           example: JRA1B2C3DE
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketClass:
 *                 type: string
 *               selectedDay:
 *                 type: string
 *               passengers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Passenger'
 *     responses:
 *       '200':
 *         description: The updated booking.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       '400':
 *         description: No valid booking fields were provided.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Not allowed to modify this booking.
 *       '404':
 *         description: Booking not found.
 *       '500':
 *         description: Failed to update booking.
 */
router.put('/bookings/:id', requireApiLogin, updateBooking);

/**
 * @openapi
 * /api/bookings/{id}:
 *   delete:
 *     summary: Delete a booking (admin, or a passenger on the booking)
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The booking confirmation code.
 *         schema:
 *           type: string
 *           example: JRA1B2C3DE
 *     responses:
 *       '204':
 *         description: Booking deleted.
 *       '401':
 *         description: Authentication required.
 *       '403':
 *         description: Not allowed to delete this booking.
 *       '404':
 *         description: Booking not found.
 *       '500':
 *         description: Failed to delete booking.
 */
router.delete('/bookings/:id', requireApiLogin, deleteBooking);

router.get('/trips/:id/schedules', (req, res) => {
    if (req.query.month !== undefined) {
        return getSchedulesForTripAndMonth(req, res);
    }
    return getSchedulesForTrip(req, res);
});

const specification = swaggerJsdoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Kizuna Rail Trips API',
            version: '1.0.0'
        }
    },
    apis: [
        fileURLToPath(import.meta.url).replaceAll('\\', '/')
    ]
});

router.use('/docs', swaggerUi.serve, swaggerUi.setup(specification));

export default router;
