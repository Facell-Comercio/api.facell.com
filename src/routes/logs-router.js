const { getAll, getOne } = require("../controllers/adm-logs");

const router = require("express").Router();

router.get("/", async (req, res) => {
  try {
    const users = await getAll(req);
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
