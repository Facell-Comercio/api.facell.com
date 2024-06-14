const express = require("express");
const path = require("path");
const router = require("express").Router();

const authRouter = require("./auth-router");
const uploadRouter = require("./upload-router");
const financeiroRouter = require("./financeiro/financeiro-router");
const grupoEconomico = require("./grupo-economico-router");
const filial = require("./filial-router");
const user = require("./user-router");
const departamento = require("./departamento-router");
const permissao = require("./permissao-router");

const datasys = require("./datasys");
const tim = require("./tim");
const authMiddleware = require("../middlewares/auth-middleware");

// const datasysRouter = require('./datasys/datasys')
// const timRouter = require('./tim/router')
// const esteiraRouter = require('./esteira/esteiraRouter')
// const facellRouter = require('./facell/facellRouter')

router.get("/", (req, res) => {
  res.status(200).json({ msg: "Sucesso!" });
});
router.use("/auth", authRouter);

router.use("/", authMiddleware);

router.use("/upload", uploadRouter);
router.use("/financeiro", financeiroRouter);
router.use("/grupo-economico", grupoEconomico);
router.use("/filial", filial);
router.use("/user", user);
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
