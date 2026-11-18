import { Router } from "express";
import {
  getSchedulesForTrip,
  getSchedulesForTripAndMonth,
} from "../controllers/schedules.js";

const router = Router();

/**
 * @swagger
 * /api/trips/{id}/schedules:
 *   get:
 *     summary: Get schedules for a trip
 *     description: Returns schedules for a trip, optionally limited to a month when the trip operates.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip identifier
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month number (1-12)
 *     responses:
 *       200:
 *         description: Schedules for the trip and selected operating month
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   tripId:
 *                     type: string
 *                   departureTime:
 *                     type: string
 *                   arrivalTime:
 *                     type: string
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: string
 *                   status:
 *                     type: boolean
 *       400:
 *         description: Month is not an integer from 1 through 12
 *       500:
 *         description: Failed to fetch schedules
 */
router.get("/trips/:id/schedules", (req, res) => {
  if (req.query.month === undefined) {
    return getSchedulesForTrip(req, res);
  }

  return getSchedulesForTripAndMonth(req, res);
});

export default router;