const db = require("../config/configdb");

class BookingController {
  // Create New Booking and Assign Queue Number
  async createBooking(booking) {
    const [rows] = await db.execute(
      "SELECT MAX(queueNumber) AS maxQueue FROM dlt_booking WHERE servicePointId = ? AND bookingDate = ?",
      [booking.servicePointId, booking.bookingDate]
    );
    const maxQueue = rows[0].maxQueue || 0;

    try {
      const [result] = await db.execute(
        `INSERT INTO dlt_booking
             (userId, servicePointId, bookingType, bookingDate, bookingTime, queueNumber, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          booking.userId,
          booking.servicePointId,
          booking.bookingType,
          booking.bookingDate,
          booking.bookingTime,
          maxQueue + 1,
        ]
      );
      return result;
    } catch (error) {
      if (error.errno === 1452) {
        // ER_NO_REFERENCED_ROW_2
        console.error("Foreign Key Constraint Failed:", error.sqlMessage);
        throw new Error(
          "Cannot create booking: User ID or Service Point ID does not exist."
        );
      }
      throw error;
    }
  }

  // Get All Bookings
  async getAllBookings() {
    const [rows] = await db.execute("SELECT * FROM dlt_booking");
    return rows;
  }

  // Get Booking by User ID
  async getBookingsByUser(userId) {
    const [rows] = await db.execute(
      "SELECT * FROM dlt_booking WHERE userId = ? ORDER BY bookingDate, bookingTime",
      [userId]
    );
    return rows;
  }

  // Update Booking Status (expire after 15 min)
  async updateExpiredQueues() {
    try {
      await db.execute(
        `UPDATE dlt_booking 
         SET status = 'expired' 
         WHERE status = 'active' 
           AND TIMESTAMPDIFF(MINUTE, createdAt, CONVERT_TZ(NOW(), '+00:00', '+07:00')) > 15`
      );

      const [nextQueue] = await db.execute(
        `SELECT bookingId, queueNumber, bookingType 
         FROM dlt_booking 
         WHERE status = 'active' 
         ORDER BY bookingDate, bookingTime, queueNumber ASC 
         LIMIT 1`
      );

      return nextQueue;
    } catch (error) {
      console.error("Error updating expired queues:", error);
      throw error;
    }
  }

  // Reset daily queues older than today
  async resetDailyQueues() {
    await db.execute("DELETE FROM dlt_booking WHERE bookingDate < CURDATE()");
  }

  // Reset all queues
  async resetAllQueues() {
    try {
      await db.execute("DELETE FROM dlt_booking");
      console.log("All queues reset successfully");
    } catch (error) {
      console.error("Error resetting queues:", error);
      throw error;
    }
  }

  // Get Available Slots for a service point and date
  async getAvailableSlots(servicePointId, bookingDate) {
    const [rows] = await db.execute(
      "SELECT bookingTime FROM dlt_booking WHERE servicePointId = ? AND bookingDate = ?",
      [servicePointId, bookingDate]
    );

    const slots = ["08:30", "13:00"];

    const bookedTimes = rows.map((row) => row.bookingTime);
    return slots.filter((slot) => !bookedTimes.includes(slot));
  }

  // Get Next Active Queue and mark as called
  async getNextActiveQueue() {
    try {
      const [rows] = await db.execute(
        `SELECT bookingId, queueNumber, bookingType, bookingDate, bookingTime 
         FROM dlt_booking 
         WHERE status = 'active' 
         ORDER BY bookingDate, bookingTime, queueNumber ASC 
         LIMIT 1`
      );

      if (rows.length > 0) {
        const nextQueue = rows[0];
        await db.execute(
          `UPDATE dlt_booking SET status = 'called' WHERE bookingId = ?`,
          [nextQueue.bookingId]
        );
        return nextQueue;
      }
      return null;
    } catch (error) {
      console.error("Error getting next active queue:", error);
      throw error;
    }
  }

  // Check if user has an active or called booking in a service point
  async checkUserBooking(userId, servicePointId) {
    try {
      const [rows] = await db.execute(
        `SELECT bookingId, queueNumber, bookingType, bookingDate, bookingTime, status 
         FROM dlt_booking 
         WHERE userId = ? AND servicePointId = ? AND status IN ('active', 'called') 
         ORDER BY bookingDate, bookingTime ASC 
         LIMIT 1`,
        [userId, servicePointId]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error checking user booking:", error);
      throw error;
    }
  }

  // Get booking by queueNumber
  async getBookingByQueueNumber(queueNumber) {
    try {
      const [rows] = await db.execute(
        `SELECT bookingId, queueNumber, bookingType, bookingDate, bookingTime, status 
         FROM dlt_booking 
         WHERE queueNumber = ? 
         LIMIT 1`,
        [queueNumber]
      );

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error getting booking by queueNumber:", error);
      throw error;
    }
  }

  // Cancel a booking by ID
  async cancelBooking(bookingId) {
    try {
      const [result] = await db.execute(
        `UPDATE dlt_booking SET status = 'cancel' WHERE bookingId = ?`,
        [bookingId]
      );
      return result;
    } catch (error) {
      console.error("Error canceling booking:", error);
      throw error;
    }
  }
}

module.exports = new BookingController();
