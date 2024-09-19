const http = require("http");
const path = require("path");

const express = require("express");
const cors = require("cors");
const socketIo = require("socket.io");
const { logger } = require("./logger");

require("./mysql");

require("dotenv").config();

// Inicia os cronjobs
require("./src/jobs/index");

app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost",
      "https://app.facell.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    exposedHeaders: ["Content-Disposition"],
  })
);

// const configureSocketModule = require('./src/socket/socket')
app.use("/", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/temp", express.static(path.join(__dirname, "public", "temp")));

const Boleto = require('node-boleto').Boleto;

app.get('/boleto/:id', (req, res) => {
  const boletoId = req.params.id;
  console.log(boletoId);
  
  var boleto = new Boleto({
    'banco': "santander", // nome do banco dentro da pasta 'banks'
    'data_emissao': new Date(),
    'data_vencimento': new Date(new Date().getTime() + 5 * 24 * 3600 * 1000), // 5 dias futuramente
    'valor': 1500, // R$ 15,00 (valor em centavos)
    'nosso_numero': "1234567",
    'numero_documento': "123123",
    'cedente': "Pagar.me Pagamentos S/A",
    'cedente_cnpj': "18727053000174", // sem pontos e traços
    'agencia': "3978",
    'codigo_cedente': "6404154", // PSK (código da carteira)
    'carteira': "102"
  });

  boleto.renderHTML(function(html){
    res.send(html);
  })
  // Envia o HTML para o cliente
});

const router = require("./src/routes/router");
app.use(router);

const server = http.createServer(app);

const PORTA = 7000;
server.listen(PORTA, () => {
  logger.info({
    module: "ROOT",
    origin: "INDEX",
    method: "LISTEN",
    data: { message: "Backend Datasys is running... na porta " + PORTA },
  });
});
// const io = socketIo(server, {
//     cors: {
//         origin: ["http://localhost"],
//         methods: ["GET","POST"],
//     }
// });
// configureChatModule(io)
