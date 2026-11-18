import mongoose from "mongoose";
import schedule from "./schemas/schedules.js";

export async function getSchedulesByTripId(tripId, month) {
  if (month !== undefined) {
    const database = mongoose.connection.db;

    if (!database) {
      throw new Error("Database not initialized. Call connectToDb first.");
    }

    const trip = await database
      .collection("trips")
      .findOne({ id: tripId }, { projection: { operatingMonths: 1 } });

    if (!trip?.operatingMonths?.includes(month)) {
      return [];
    }
  }

  return schedule.find({ tripId }).sort({ id: 1 }).lean();
}