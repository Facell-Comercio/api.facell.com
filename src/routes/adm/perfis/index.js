const router = require("express").Router();

const controller = require("../../../controllers/adm/perfis-controller");

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.insertOne);
router.put("/", controller.update);
router.delete("/:id", controller.deletePerfil);

module.exports = router;
