const router = require("express").Router();
const {
  registerUserMachine,
  sendNotificationUser,
  sendNotificationUsers,
  sendNotificationAllUsers,
} = require("../controllers/notification-controller");
require("dotenv").config();

const publicKey = process.env.WEBPUSH_PUBLIC_KEY;

router.get("/public-key", async (req, res) => {
  try {
    res.status(200).json(publicKey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const result = await registerUserMachine(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/send", async (req, res) => {
  try {
    const response = await sendNotificationUser(req);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/send/users", async (req, res) => {
  try {
    const response = await sendNotificationUsers(req);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/send/all-users", async (req, res) => {
  try {
    const response = await sendNotificationAllUsers(req);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
