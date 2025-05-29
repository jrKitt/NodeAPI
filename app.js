const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cron = require("node-cron");
const bodyParser = require("body-parser");
const Routes = require("./Route");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ["http://localhost:3001", "https://fd72-183-89-208-244.ngrok-free.app"],  
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running and ready to use.");
});

app.use("/api", Routes);

cron.schedule("0 0 * * *", async () => {
  try {
    await Booking.resetDailyQueues();
    console.log("Daily queues reset.");
  } catch (error) {
    console.error("Error resetting daily queues:", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
