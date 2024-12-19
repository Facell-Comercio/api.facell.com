const router = require("express").Router();

router.get("/", async (req, res) => {
  try {
    res.status(200).json(new Date());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
