const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const insertOneTituloReceber = require("./insertOneTituloReceber");
const { normalizeNumberOnly, parseCurrency } = require("../../../../../helpers/mask");
const { addDays } = require("date-fns");
const fs = require("fs/promises");
const { lerXML, importFromExcel } = require("../../../../../helpers/lerXML");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;

    try {
      conn = await db.getConnection();
      const { user } = req;

      await conn.beginTransaction();

      const files = req.files;

      if (!files || !files.length) {
        throw new Error("Arquivos não recebidos!");
      }
      const retorno = [];

      let qtde_reembolsos = 0;
      //* PASSANDO EM TODOS OS ARQUIVOS
      for (const file of files) {
        const filePath = file?.path;
        const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
        let obj = {
          arquivo: originalName,
        };

        try {
          const excelFileList = importFromExcel(filePath)
            .filter((value) => parseCurrency(value["Valor Total"]) > 0)
            .map((value) => ({
              pedido: value["Pedido"],
              cnpj: value["CNPJ"],
              pedido_sap: value["Pedido SAP"],
              mes: value["Mês"].trim(),
              ano: value["Ano"],
              tipo_de_remuneracao: value["Tipo de Remuneração"].trim(),
              valor_total: parseCurrency(value["Valor Total"]),
            }));

          const wrongResult = excelFileList.filter(
            (res) =>
              !(
                res.tipo_de_remuneracao === "PRICE" ||
                res.tipo_de_remuneracao === "REBATE" ||
                res.tipo_de_remuneracao === "ADM"
              )
          );
          if (wrongResult.length > 0) {
            throw new Error("Há remunerações inválidas no arquivo!");
          }

          //* LANÇAMENTO CADA REEMBOLSO DO AQUIVO
          for (const reembolso of excelFileList) {
            obj = {
              ...obj,
              ...reembolso,
            };
            try {
              //* DADOS FILIAL
              const [rowFilial] = await conn.execute(
                "SELECT id, uf, id_grupo_economico FROM filiais WHERE cnpj = ?",
                [normalizeNumberOnly(reembolso.cnpj)]
              );
              const filial = rowFilial && rowFilial[0];

              //* FORNECEDOR 2473 - TIM NATAL RN
              //* FORNECEDOR 3784 - TIM RECIFE PE
              const id_fornecedor = filial.uf == "RN" ? 2473 : 3784;
              const [rowFornecedor] = await conn.execute(
                "SELECT nome, cnpj FROM fin_fornecedores WHERE id = ? AND active = 1",
                [id_fornecedor]
              );
              if (rowFornecedor && rowFornecedor.length === 0) {
                throw new Error("Fornecedor não encontrado!");
              }

              //* VENCIMENTOS
              const vencimentos = [
                {
                  data_vencimento: addDays(new Date(), 30),
                  valor: reembolso.valor_total,
                },
              ];

              //* CENTRO DE CUSTO
              const [rowCentroCusto] = await conn.execute(
                `
                SELECT id
                FROM fin_centros_custo
                WHERE nome LIKE 'FINANCEIRO'
                AND id_grupo_economico = ?
                `,
                [filial.id_grupo_economico]
              );
              const centro_custo = rowCentroCusto && rowCentroCusto[0];
              if (!centro_custo) {
                throw new Error("Centro de custo não encontrado!");
              }

              //* PLANO DE CONTAS
              const [rowPlanoContas] = await conn.execute(
                `
                SELECT id
                FROM fin_plano_contas
                WHERE id_grupo_economico = ?
                AND descricao LIKE CONCAT(?,'%')
                `,
                [filial.id_grupo_economico, reembolso.tipo_de_remuneracao]
              );
              const plano_contas = rowPlanoContas && rowPlanoContas[0];
              if (!plano_contas) {
                throw new Error("Plano de contas não encontrado!");
              }

              //* ITENS RATEIO
              const itens_rateio = [
                {
                  id_filial: filial.id,
                  id_centro_custo: centro_custo.id,
                  id_plano_conta: plano_contas.id,
                  valor: reembolso.valor_total,
                  percentual: 1,
                },
              ];

              //* DESCRIÇÃO DO TÍTULO
              const descricao =
                `${reembolso.tipo_de_remuneracao} ${reembolso.mes}/${reembolso.ano}`.toUpperCase();

              //* CRIANDO TÍTULO
              const result = await insertOneTituloReceber({
                user,
                body: {
                  id_fornecedor,

                  id_filial: filial.id,
                  id_grupo_economico: filial.id_grupo_economico,

                  id_tipo_documento: 3,
                  data_emissao: new Date(),
                  tim_pedido: reembolso.pedido,
                  tim_pedido_sap: reembolso.pedido_sap,
                  valor: reembolso.valor_total,
                  descricao,

                  vencimentos,

                  itens_rateio,
                },
                conn_externa: conn,
              });

              obj = {
                id: result.id_titulo,
                ...obj,
                status_importacao: "OK",
                observação: "IMPORTAÇÃO REALIZADA COM SUCESSO",
              };
              qtde_reembolsos++;
            } catch (erro) {
              let message = String(erro.message).toUpperCase();
              if (message.includes("DUPLICATE ENTRY")) {
                message = "TÍTULO JÁ HAVIA SIDO CRIADO";
              }
              obj = {
                ...obj,
                status_importacao: "ERRO",
                observação: message,
              };
            } finally {
              retorno.push(obj);
            }
          }
        } catch (erro) {
          obj = {
            ...obj,
            status_importacao: "ERRO",
            observação: "Há remunerações inválidas no arquivo!".toUpperCase(),
          };
          retorno.push(obj);
        }
      }

      // * Insert em log de importações de relatórios:
      if (qtde_reembolsos > 0) {
        await conn.execute(
          `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
          [
            user.id,
            "IMPORT_LANCAMENTOS_REEMBOLSOS_TIM",
            `Foram lançados ${qtde_reembolsos} reembolsos!`,
          ]
        );
      }

      await conn.commit();
      resolve(retorno);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "LANCAMENTO_REEMBOLSOS_TIM",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
