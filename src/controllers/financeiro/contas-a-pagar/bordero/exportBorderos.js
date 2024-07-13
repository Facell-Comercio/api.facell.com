const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

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
          response.vencimentos.forEach((titulo) => {
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
              "CPF/CNPJ": titulo.cnpj ? normalizeCnpjNumber(titulo.cnpj) : "",
              FORNECEDOR: titulo.nome_fornecedor || "",
              "Nº DOC": titulo.num_doc || "",
              DESCRIÇÃO: titulo.descricao || "",
              VALOR:
                parseFloat(titulo.valor_total && titulo.valor_total.toString()) ||
                "",
              "CENTRO CUSTO": titulo.centro_custo || "",
  
              "CONTA BANCÁRIA": response.conta_bancaria || "",
              BANCO: response.banco || "",
              STATUS: titulo.status || "",
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
  }