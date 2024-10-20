const {
  logger,
} = require("../../../../../logger");
const {
  getAllFaturasBordero,
} = require("../cartoes-controller");
const {
  getAllVencimentosBordero,
} = require("../vencimentos-controller");

module.exports = function findNewItems(req) {
  return new Promise(async (resolve, reject) => {
    try {
      req.query = {
        ...req.query,
        emBordero: false,
        minStatusTitulo: 4,
        enabledStatusPgto: ["erro", "pendente"],
        closedFatura: true,
      };
      const { pagination } = req.query;
      // * Obter os vencimentos
      const vencimentos =
        await getAllVencimentosBordero(req);

      // * Obter as faturas
      const faturas = await getAllFaturasBordero(
        req
      );

      const rows = [
        ...vencimentos.rows,
        ...faturas.rows,
      ];
      const qtdeTotal =
        vencimentos.qtdeTotal > faturas.qtdeTotal
          ? vencimentos.qtdeTotal
          : faturas.qtdeTotal;

      const objResponse = {
        rows,
        pageCount: Math.ceil(
          qtdeTotal / pagination?.pageSize || 1
        ),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ALL_VENCIMENTOS_BORDERO",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    }
  });
};
