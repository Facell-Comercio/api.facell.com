const router = require("express").Router();
const WebPush = require("web-push");
const { registerUserMachine } = require("../controllers/notification-controller");
require("dotenv").config();

const publicKey =
  "BHhNfEytYI8VkxHXRgo68Ag6VGWlkVMda4CImE9RzjhT_Zz-NYoMz7n_Vur4k0Hq4plgs2Cd_6SneBzHXa9rbco";
const privateKey = "PoesNGHLuHkeBFOSXggSkMfDDSpBpur9m8HywCbuiaU";

const baseURL = process.env.BASE_URL;
const isDevelopment = process.env.NODE_ENV == "development";
const httpsBaseURL = "https://21bb-187-19-163-124.ngrok-free.app";
WebPush.setVapidDetails(isDevelopment ? httpsBaseURL : baseURL, publicKey, privateKey);

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
    const { subscription, user } = req.body;

    setTimeout(() => {
      WebPush.sendNotification(subscription, "HELLO WORLD!");
    }, 5000);
    res.status(200).json(publicKey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
