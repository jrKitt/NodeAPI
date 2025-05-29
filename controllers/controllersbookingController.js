const Booking = require("../models/modelsbookingModel");
const QRCode = require("qrcode");

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.getAllBookings();
    res.json({
      status: "success",
      message: "ดึงข้อมูลการจองคิวทั้งหมดสำเร็จ",
      bookings: bookings,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.createBooking = async (req, res) => {
  const validBookingTypes = [
    "งานทะเบียน",
    "งานใบอนุญาติ",
    "ตรวจสภาพรถขนส่ง",
    "อบรมคืนคะแนน",
    "บริการด้านอื่นๆ",
  ];
  const { bookingType } = req.body;

  if (!validBookingTypes.includes(bookingType)) {
    return res.status(400).json({ error: "ประเภทการจองไม่ถูกต้อง" });
  }

  try {
    const result = await Booking.createBooking(req.body);
    res.status(201).json({
      status: "success",
      message: "จองคิวสำเร็จ",
      booking: {
        bookingId: result.insertId,
        queueNumber: result.queueNumber,
        bookingType: req.body.bookingType,
        bookingDate: req.body.bookingDate,
        bookingTime: req.body.bookingTime,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "กรุณาใส่ข้อมูลให้ครบถ้วน", msg: err });
  }
};

exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({
      status: "error",
      message: "กรุณาระบุรหัสการจอง",
    });
  }

  try {
    const result = await Booking.cancelBooking(bookingId);

    if (!result) {
      return res.status(500).json({
        status: "error",
        message: "เกิดข้อผิดพลาดในการยกเลิกการจอง",
      });
    }

    if (result.affectedRows > 0) {
      return res.status(200).json({
        status: "success",
        message: "การจองคิวถูกยกเลิกสำเร็จ",
      });
    } else {
      return res.status(404).json({
        status: "error",
        message: "ไม่พบการจองคิวที่ต้องการยกเลิก",
      });
    }
  } catch (err) {
    console.error("Error canceling booking:", err);
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการยกเลิกการจอง",
      details: err.message || err,
    });
  }
};

exports.manageQueues = async (req, res) => {
  try {
    const updatedQueues = await Booking.updateExpiredQueues();

    if (updatedQueues.length > 0) {
      const nextQueue = updatedQueues[0];
      res.status(200).json({
        status: "success",
        message: "อัพเดตคิวถัดไปสำเร็จ",
        currentQueue: {
          bookingId: nextQueue.bookingId,
          queueNumber: nextQueue.queueNumber,
          bookingType: nextQueue.bookingType,
        },
      });
    } else {
      res.status(200).json({ message: "ไม่มีคิวที่ต้องอัพเดต" });
    }
  } catch (err) {
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการอัพเดตคิว",
      details: err,
    });
  }
};

exports.getUserBookings = async (req, res) => {
  const userId = req.params.userId;
  try {
    const bookings = await Booking.getBookingsByUser(userId);
    res.status(200).json({
      status: "success",
      message: "ดึงข้อมูลการจองคิวของผู้ใช้สำเร็จ",
      bookings: bookings,
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching user bookings", msg: err });
  }
};

exports.resetAllQueues = async (req, res) => {
  try {
    await Booking.resetAllQueues();
    res
      .status(200)
      .json({ status: "success", message: "รีเซ็ตคิวทั้งหมดสำเร็จ" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "เกิดข้อผิดพลาดในการรีเซ็ตคิว", details: err });
  }
};

exports.getAvailableSlots = async (req, res) => {
  const { servicePointId, bookingDate } = req.query;
  try {
    const slots = await Booking.getAvailableSlots(servicePointId, bookingDate);
    res.status(200).json({ status: "success", message: "เวลาที่ว่าง", slots });
  } catch (err) {
    res
      .status(500)
      .json({ error: "เกิดข้อผิดพลาดในการดึงเวลาที่ว่าง", details: err });
  }
};

exports.resetDailyQueues = async (req, res) => {
  try {
    const result = await Booking.resetDailyQueues();
    res.status(200).json({
      status: "success",
      message: "รีเซ็ตคิวประจำวันสำเร็จ",
      result: result,
    });
  } catch (err) {
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการรีเซ็ตคิวประจำวัน",
      details: err,
    });
  }
};

exports.getNextQueue = async (req, res) => {
  try {
    const nextQueue = await Booking.getNextActiveQueue();

    if (nextQueue) {
      res.status(200).json({
        status: "success",
        message: "คิวถัดไปที่สามารถเรียกได้",
        queue: nextQueue,
      });
    } else {
      res.status(200).json({
        status: "success",
        message: "ไม่มีคิวที่สามารถเรียกได้ในขณะนี้",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการดึงคิวถัดไป",
      details: err,
    });
  }
};

exports.checkInBooking = async (req, res) => {
  const { userId, servicePointId } = req.body;

  try {
    const booking = await Booking.checkUserBooking(userId, servicePointId);

    if (booking) {
      res.status(200).json({
        message: "การจองคิวถูกต้อง",
        booking: booking,
      });
    } else {
      res.status(404).json({
        message: "ไม่พบการจองคิวสำหรับผู้ใช้นี้",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการตรวจสอบการจอง",
      details: err,
    });
  }
};

exports.generateBookingQRCode = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const bookingLink = `http://localhost:3000/check-in/${bookingId}`;
    const qrCode = await QRCode.toDataURL(bookingLink);

    res.status(200).json({
      message: "สร้าง QR Code สำเร็จ",
      qrCode: qrCode,
      link: bookingLink,
    });
  } catch (err) {
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการสร้าง QR Code",
      details: err,
    });
  }
};

exports.checkInWithQRCode = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await Booking.getBookingById(bookingId);

    if (booking) {
      res.status(200).json({
        message: "การจองคิวถูกต้อง",
        booking: booking,
      });
    } else {
      res.status(404).json({
        message: "ไม่พบการจองคิวสำหรับรหัสนี้",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการตรวจสอบการจอง",
      details: err,
    });
  }
};

exports.checkInWithQueueNumber = async (req, res) => {
  const { queueNumber } = req.params;

  try {
    const booking = await Booking.getBookingByQueueNumber(queueNumber);
    if (booking.status === "called") {
      res.status(200).json({
        message: "คิวถูกเรียกแล้ว",
        booking: booking,
      });
    }
    if (booking) {
      res.status(200).json({
        message: "การจองคิวถูกต้อง",
        booking: booking,
      });
    } else {
      res.status(404).json({
        message: "ไม่พบการจองคิวสำหรับหมายเลขคิวนี้",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการตรวจสอบการจองด้วยหมายเลขคิว",
      details: err,
    });
  }
};
