const router = require("express").Router();

const authRouter = require("./auth-router");
const uploadRouter = require("./upload-router");
const storageRouter = require("./storage-router");
const comercialRouter = require("./comercial/comercial-router");
const financeiroRouter = require("./financeiro/financeiro-router");
const grupoEconomico = require("./grupo-economico-router");
const filial = require("./filial-router");
const user = require("./user-router");
const logs = require("./logs-router");
const departamento = require("./departamento-router");
const permissao = require("./permissao-router");

const datasys = require("./datasys");
const tim = require("./tim");
const authMiddleware = require("../middlewares/auth-middleware");
const {
  gerarRateio,
  removerRateio,
  subirAnexosParaDrive,
} = require("../controllers/testes-controller");

// const datasysRouter = require('./datasys/datasys')
// const timRouter = require('./tim/router')
// const esteiraRouter = require('./esteira/esteiraRouter')
// const facellRouter = require('./facell/facellRouter')
router.post("/operacao-teste", async (req, res) => {
  try {
    // await gerarRateio(req);
    // await removerRateio(req);
    // await subirAnexosParaDrive(req);
    res.status(200).json({ message: "Sucesso!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", (req, res) => {
  res.status(200).json({ msg: "Sucesso!" });
});
router.use("/auth", authRouter);

router.use("/", authMiddleware);

router.use("/upload", uploadRouter);
router.use("/storage", storageRouter);
router.use("/financeiro", financeiroRouter);
router.use("/comercial", comercialRouter);
router.use("/grupo-economico", grupoEconomico);
router.use("/filial", filial);
router.use("/users", user);
router.use("/logs", logs);
router.use("/departamento", departamento);
router.use("/permissao", permissao);

router.use("/datasys", datasys);
router.use("/tim", tim);

// app.use('/datasys', datasysRouter)
// app.use('/comissao-tim', timRouter)
// app.use('/tim', timRouter)
// app.use('/esteira', esteiraRouter)
// app.use('/facell', facellRouter)

module.exports = router;
