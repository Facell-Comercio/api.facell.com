const router = require("express").Router();

const vales = require("./vales");
const dashboard = require("./dashboard");

router.use("/vales", vales);
router.use("/dashboard", dashboard);

module.exports = router;
