const db = require("../config/configdb");

const userModel = {
  async findByUsername(username) {
    const [rows] = await db.query(
      "SELECT * FROM dlt_user WHERE phoneNumber = ?",
      [username]
    );
    return rows[0];
  },

  async findByCitizenId(citizenId) {
    const [rows] = await db.query(
      "SELECT * FROM dlt_user WHERE citizenId = ?",
      [citizenId]
    );
    console.log("findByCitizenId rows:", rows);
    return rows[0];
  },

  async findByLineId(lineId) {
    const [rows] = await db.query("SELECT * FROM dlt_user WHERE lineId = ?", [
      lineId,
    ]);
    return rows[0];
  },

  async findById(userId) {
    const [rows] = await db.query("SELECT * FROM dlt_user WHERE userId = ?", [
      userId,
    ]);
    return rows[0];
  },

  async create(user) {
    const [result] = await db.query(
      "INSERT INTO dlt_user (citizenId, firstName, lastName, phoneNumber, lineId, password, profilePicture, lineDisplayName) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        user.citizenId || null,
        user.firstName || '',
        user.lastName || '',
        user.phoneNumber || null,
        user.lineId || null,
        user.password || null,
        user.profilePicture || null,
        user.lineDisplayName || null,
      ]
    );
    return { userId: result.insertId, ...user };
  },

  // สร้าง user ใหม่สำหรับ LINE login เฉพาะ
  async createFromLineLogin(lineData) {
    const [result] = await db.query(
      "INSERT INTO dlt_user (firstName, lineId, profilePicture, lineDisplayName, citizenId, lastName, phoneNumber, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        lineData.displayName,
        lineData.lineUserId,
        lineData.pictureUrl,
        lineData.displayName,
        null, // citizenId เป็น null สำหรับ LINE user
        '', // lastName เป็นค่าว่าง
        null, // phoneNumber เป็น null
        null // password เป็น null สำหรับ LINE user
      ]
    );
    
    return {
      userId: result.insertId,
      firstName: lineData.displayName,
      lastName: '',
      lineId: lineData.lineUserId,
      profilePicture: lineData.pictureUrl,
      lineDisplayName: lineData.displayName,
      citizenId: null,
      phoneNumber: null
    };
  },

  async updatePassword(userId, passwordHash) {
    await db.query("UPDATE dlt_user SET password = ? WHERE userId = ?", [
      passwordHash,
      userId,
    ]);
  },

  // อัพเดทข้อมูล LINE user
  async updateLineUser(lineId, updateData) {
    const updates = [];
    const values = [];
    
    if (updateData.displayName) {
      updates.push("firstName = ?", "lineDisplayName = ?");
      values.push(updateData.displayName, updateData.displayName);
    }
    
    if (updateData.pictureUrl) {
      updates.push("profilePicture = ?");
      values.push(updateData.pictureUrl);
    }
    
    if (updates.length > 0) {
      updates.push("updatedAt = CURRENT_TIMESTAMP");
      values.push(lineId);
      
      await db.query(
        `UPDATE dlt_user SET ${updates.join(", ")} WHERE lineId = ?`,
        values
      );
    }
  },

  // ผูก LINE account กับ account ที่มีอยู่แล้ว
  async linkLineAccount(userId, lineData) {
    await db.query(
      "UPDATE dlt_user SET lineId = ?, profilePicture = ?, lineDisplayName = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?",
      [
        lineData.lineUserId,
        lineData.pictureUrl,
        lineData.displayName,
        userId
      ]
    );
  },

  // ตรวจสอบว่ามี user ที่มี citizenId เดียวกันหรือไม่
  async findExistingUserForLinking(criteria) {
    // ถ้าในอนาคตต้องการให้ user สามารถผูก LINE กับ account เดิมได้
    // สามารถใช้ email หรือ phone number เป็นตัวเชื่อม
    if (criteria.phoneNumber) {
      const [rows] = await db.query(
        "SELECT * FROM dlt_user WHERE phoneNumber = ? AND lineId IS NULL",
        [criteria.phoneNumber]
      );
      return rows[0];
    }
    return null;
  }
};

module.exports = userModel;