const boletos = require("./boletos");
const conferenciaDeCaixa = require("./conferencia-de-caixa");
const importacoes = require("./importacoes");

module.exports = {
  ...conferenciaDeCaixa,
  ...importacoes,
  ...boletos,
};
