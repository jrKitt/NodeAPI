// controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("../models/modelsuserModel");
require("dotenv").config();

const PUBLIC_KEY = process.env.PUBLIC_KEY;
const REFRESH_KEY = process.env.REFRESH_KEY;
const ACCESS_KEY = process.env.ACCESS_KEY;
const SALT_ROUNDS = 10;

class AuthController {
  async generatePublicToken(req, res) {
    try {
      const token = jwt.sign({ type: "public", app: "web_api" }, PUBLIC_KEY, {
        expiresIn: "60m",
      });
      res.json({ message: "Public token created", token });
    } catch (err) {
      res.status(500).json({
        data: { message: "Failed to generate token", error: err.message },
      });
    }
  }

  async register(req, res) {
    const { citizenId, firstName, lastName, phoneNumber, lineId, password } =
      req.body;
    try {
      const existingUser = await userModel.findByCitizenId(citizenId);
      if (existingUser) {
        return res.status(400).json({ message: "ชื่อผู้ใช้งานซ้ำ" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await userModel.create({
        citizenId,
        firstName,
        lastName,
        phoneNumber,
        lineId,
        password: passwordHash,
      });

      res.status(201).json({
        message: "ลงทะเบียนสำเร็จ",
        userId: user.userId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        data: { message: "ลงทะเบียนไม่สำเร็จ", error: err.message },
      });
    }
  }

  async login(req, res) {
    const { citizenId, password } = req.body;

    try {
      const existingUser = await userModel.findByCitizenId(citizenId);
      if (!existingUser) {
        return res.status(401).json({ message: "ไม่พบผู้ใช้งาน" });
      }

      const match = await bcrypt.compare(password, existingUser.password);
      if (!match) {
        return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
      }

      const accessToken = jwt.sign(
        { userId: existingUser.userId },
        ACCESS_KEY,
        {
          expiresIn: "30m",
        }
      );

      res.status(200).json({
        message: "เข้าสู่ระบบสำเร็จ",
        userId: existingUser.userId,
        token: accessToken,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Login failed", error: err.message });
    }
  }

  async oauth(req, res) {
    const { code } = req.body;
    try {
      const decoded = jwt.verify(code, REFRESH_KEY);
      const user = await userModel.findById(decoded.userId);

      if (!user) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }

      const accessToken = jwt.sign({ userId: user.userId }, ACCESS_KEY, {
        expiresIn: "30m",
      });

      res.json({ data: { message: "Access granted", token: accessToken } });
    } catch (err) {
      res
        .status(401)
        .json({ message: "Invalid refresh token", error: err.message });
    }
  }

  async onlineLogin(req, res) {
    const { tel, lineId } = req.body;

    try {
      let user = await userModel.findByLineId(lineId);
      if (!user) {
        user = await userModel.create({
          citizenId: "",
          firstName: "",
          lastName: "",
          phoneNumber: tel,
          lineId,
          password: "",
        });
      }

      const accessToken = jwt.sign({ userId: user.userId }, ACCESS_KEY, {
        expiresIn: "30m",
      });

      res.json({ data: { message: "Logged in via LINE", token: accessToken } });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Online login failed", error: err.message });
    }
  }

  async newPassword(req, res) {
    const { tel, password } = req.body;
    try {
      const user = await userModel.findByUsername(tel);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await userModel.updatePassword(user.userId, passwordHash);

      res.json({ data: { message: "Password updated successfully" } });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to update password", error: err.message });
    }
  }

  async verifyToken(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ message: "Token not found" });
    }

    jwt.verify(token, ACCESS_KEY, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Token invalid or expired", error: err.message });
      }

      const user = await userModel.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, user: {
        userId: user.userId,
        citizenId: user.citizenId,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
      }});
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to verify token", error: err.message });
  }
}

  async getUserProfile(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: "Token not found" });
      }

      jwt.verify(token, ACCESS_KEY, async (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "Token invalid or expired", error: err.message });
        }

        const user = await userModel.findById(decoded.userId);  // ใช้ userModel เพื่อดึงข้อมูลผู้ใช้
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          success: true,
          user: {
            userId: user.userId,
            citizenId: user.citizenId,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            lineId: user.lineId,  // ถ้าต้องการ
            profilePicture: user.profilePicture,  // ถ้าต้องการ
          },
        });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to get user profile", error: err.message });
    }
  }
}

module.exports = new AuthController();
