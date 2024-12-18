const router = require("express").Router();

const authRouter = require("./auth-router");
const uploadRouter = require("./upload-router");
const storageRouter = require("./storage-router");
const financeiroRouter = require("./financeiro/financeiro-router");
const marketingRouter = require("./marketing/marketing-router");
const comercialRouter = require("./comercial/comercial-router");
const pessoalRouter = require("./pessoal/pessoal-router");
const grupoEconomico = require("./grupo-economico-router");
const filial = require("./filial-router");
const user = require("./user-router");
const adm = require("./adm/adm-router");
const departamento = require("./departamento-router");
const permissao = require("./permissao-router");
const testes = require("./testes-router");
const notification = require("./notification-router");
const qualidade = require("./qualidade/qualidade-router");

const datasys = require("./datasys");
const tim = require("./tim");
const realtime = require("./realtime-router");
const authMiddleware = require("../middlewares/auth-middleware");
const {
  gerarRateio,
  removerRateio,
  subirAnexosParaDrive,
} = require("../controllers/testes-controller");
const { visualizarBoletoCaixa } = require("../controllers/financeiro/controle-de-caixa/boletos");

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

// ^ Rotas públicas
router.get("/", (req, res) => {
  res.status(200).json({ msg: "Sucesso!" });
});
router.use("/auth", authRouter);
router.use("/testes", testes);
router.get("/visualizar.boleto.caixa", visualizarBoletoCaixa);

// ^ Rotas privadas:
router.use("/", authMiddleware);

router.use("/notification", notification);
router.use("/upload", uploadRouter);
router.use("/storage", storageRouter);
router.use("/financeiro", financeiroRouter);
router.use("/marketing", marketingRouter);
router.use("/comercial", comercialRouter);
router.use("/qualidade", qualidade);
router.use("/pessoal", pessoalRouter);
router.use("/grupo-economico", grupoEconomico);
router.use("/filial", filial);
router.use("/users", user);
router.use("/adm", adm);
router.use("/departamento", departamento);
router.use("/permissao", permissao);

router.use("/datasys", datasys);
router.use("/tim", tim);
router.use("/realtime", realtime);

// app.use('/datasys', datasysRouter)
// app.use('/comissao-tim', timRouter)
// app.use('/tim', timRouter)
// app.use('/esteira', esteiraRouter)
// app.use('/facell', facellRouter)

module.exports = router;
