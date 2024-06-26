const { clearLogs } = require("../../logger");
const { getAll, getOne } = require("../controllers/adm-logs");

const router = require("express").Router();

router.get("/", async (req, res) => {
  try {
    const logs = await getAll(req);
    res.status(200).json(logs);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    const result = await clearLogs(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
