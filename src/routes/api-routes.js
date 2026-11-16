import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import {
    getAllTrips,
    getTripById
} from '../controllers/trips.js';

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
 *     summary: Get all trips
 *     tags:
 *       - Trips
 *     responses:
 *       '200':
 *         description: All trips; an empty array when none exist.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trips:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
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