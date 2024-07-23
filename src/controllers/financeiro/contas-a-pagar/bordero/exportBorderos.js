const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const getOne = require("./getOne");
const { normalizeCnpjNumber } = require("../../../../helpers/mask");

module.exports = async function exportBorderos(req) {
  return new Promise(async (resolve, reject) => {
    const { data: borderos } = req.body;
    const vencimentosBordero = [];
    try {
      if (!borderos.length) {
        throw new Error("Quantidade inválida de de borderos!");
      }

      for (const b_id of borderos) {
        const response = await getOne({ params: { id: b_id } });
        response.itens.forEach((titulo) => {
          const normalizeDate = (data) => {
            const date = new Date(data);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const formattedDay = String(day).padStart(2, "0");
            const formattedMonth = String(month).padStart(2, "0");
            return `${formattedDay}/${formattedMonth}/${year}`;
          };

          vencimentosBordero.push({
            IDPG: titulo.id_vencimento || "",
            "ID TÍTULO": titulo.id_titulo || "",
            PAGAMENTO: titulo.data_pagamento
              ? normalizeDate(titulo.data_pagamento)
              : "",
            PREVISÃO: normalizeDate(titulo.previsao) || "",
            EMISSÃO: titulo.data_emissao
              ? normalizeDate(titulo.data_emissao)
              : "",
            VENCIMENTO: titulo.data_vencimento
              ? normalizeDate(titulo.data_vencimento)
              : "",
            FILIAL: titulo.filial || "",
            "CPF/CNPJ": titulo.cnpj_fornecedor
              ? normalizeCnpjNumber(titulo.cnpj_fornecedor)
              : "",
            FORNECEDOR: titulo.nome_fornecedor || "",
            "Nº DOC": titulo.num_doc || "",
            DESCRIÇÃO: titulo.descricao || "",
            VALOR:
              parseFloat(titulo.valor_total && titulo.valor_total.toString()) ||
              "",
            "VALOR PAGO":
              parseFloat(titulo.valor_pago && titulo.valor_pago.toString()) ||
              "",
            "TIPO BAIXA": titulo.tipo_baixa || "",
            "CONTA BANCÁRIA": response.conta_bancaria || "",
            BANCO: response.banco || "",
            STATUS: titulo.status || "",
            OBS: titulo.obs || "",
          });
        });
      }

      resolve(vencimentosBordero);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "ERRO_EXPORT_BORDERO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
};
