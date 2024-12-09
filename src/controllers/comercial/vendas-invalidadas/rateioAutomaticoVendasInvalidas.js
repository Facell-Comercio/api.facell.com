const { formatDate } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { conn_externa } = req.body;
    let conn;
    try {
      const { mes, ano } = req.body;
      const params = [];
      let where = "WHERE 1 = 1 ";

      if (!mes) {
        throw new Error("Mês é obrigatório");
      }
      if (!ano) {
        throw new Error("Ano é obrigatório");
      }

      if (mes) {
        where += ` AND MONTH(ref) =? `;
        params.push(mes);
      }

      if (ano) {
        where += ` AND YEAR(ref) =? `;
        params.push(ano);
      }

      conn = conn_externa || (await db.getConnection());
      await conn.beginTransaction();

      const [vendasInvalidas] = await conn.execute(
        `SELECT * FROM comissao_vendas_invalidas ${where} AND estorno > 0`,
        params
      );

      if (!vendasInvalidas.length) {
        throw new Error("Houve algum erro no rateio dos estornos");
      }

      const retorno = [];

      for (const venda of vendasInvalidas) {
        let obj = {
          REF: venda.ref,
          FILIAL: venda.filial,
          TIPO: venda.tipo,
          SEGMENTO: venda.segmento,
          MOTIVO: venda.motivo,
          "DATA VENDA": venda.data_venda,
          PEDIDO: venda.pedido,
          GSM: venda.gsm,
          IMEI: venda.imei,
        };
        try {
          const [rowVendedor] = await conn.execute(
            `
            SELECT id, cpf, nome, cargo FROM metas
            WHERE cpf = ? AND MONTH(ref) =? AND YEAR(ref) =?
            LIMIT 1`,
            [venda.cpf_vendedor, mes, ano]
          );
          const vendedor = rowVendedor && rowVendedor[0];
          if (!vendedor) {
            throw new Error("Vendedor não encontrado");
          }

          //* SETANDO OS DADOS DO VENDEDOR NO OBJ DE RETORNO
          obj["CPF VENDEDOR"] = vendedor.cpf;
          obj["NOME VENDEDOR"] = vendedor.nome;

          const [rowFilial] = await conn.execute(
            "SELECT id, nome FROM filiais WHERE nome LIKE ? LIMIT 1",
            [venda.filial]
          );
          const filial = rowFilial && rowFilial[0];

          if ((venda.compartilhado = 0)) {
            await conn.execute(
              `INSERT INTO comissao_vendas_invalidas_rateio
              (id_venda_invalida, id_filial, cpf_colaborador, nome_colaborador, cargo_colaborador, valor, percentual)
              VALUES (?,?,?,?,?,?,?)`,
              [
                venda.id,
                filial.id,
                venda.cpf_vendedor,
                vendedor.nome,
                vendedor.cargo,
                venda.estorno,
                1,
              ]
            );
            obj["VALOR VENDEDOR"] = vendedor.estorno;
            obj["PERCENTUAL VENDEDOR"] = 1;
          }
          if ((venda.compartilhado = 1)) {
            //* RATEIO VENDEDOR
            const estorno = venda.estorno;
            await conn.execute(
              `INSERT INTO comissao_vendas_invalidas_rateio 
              (id_venda_invalida, id_filial, cpf_colaborador, nome_colaborador, cargo_colaborador, valor, percentual)
              VALUES (?,?,?,?,?,?,?)`,
              [
                venda.id,
                filial.id,
                venda.cpf_vendedor,
                vendedor.nome,
                vendedor.cargo,
                parseFloat(estorno * 0.7),
                0.7,
              ]
            );

            obj["VALOR VENDEDOR"] = parseFloat(estorno * 0.7);
            obj["PERCENTUAL VENDEDOR"] = 0.7;

            const dataVenda = formatDate(venda.data_venda, "yyyy-MM-dd");
            const [gerentes] = await conn.execute(
              `SELECT * FROM metas_agregadores
              WHERE cargo IN (GERENTE DE LOJA','GERENTE GERAL DE LOJA')
              AND filial LIKE ?
              AND ? BETWEEN data_inicial AND data_final`,
              [venda.filial, dataVenda]
            );

            //* RATEIO GERENTE GERAL
            const gerenteGeralList = gerentes.filter(
              (gerente) => gerente.cargo === "GERENTE GERAL DE LOJA"
            );
            const qtdeGerentesGerais = gerenteGeralList.length;
            if (!qtdeGerentesGerais) {
              throw new Error("Nenhum gerente geral encontrado");
            }
            let countGG = 1;
            for (const gerente of gerenteGeralList) {
              const percentual = 0.15 / qtdeGerentesGerais;
              await conn.execute(
                `INSERT INTO comissao_vendas_invalidas_rateio
                (id_venda_invalida, id_filial, cpf_colaborador, nome_colaborador, cargo_colaborador, valor, percentual)
                VALUES (?,?,?,?,?,?,?)`,
                [
                  venda.id,
                  filial.id,
                  gerente.cpf,
                  gerente.nome,
                  gerente.cargo,
                  parseFloat(estorno * percentual),
                  percentual,
                ]
              );
              obj[`VALOR GERENTE GERAL ${countGG}`] = parseFloat(estorno * percentual);
              obj[`PERCENTUAL GERENTE GERAL ${countGG}`] = percentual;
              countGG++;
            }

            //* RATEIO GERENTE DE LOJA
            const gerenteLojaList = gerentes.filter(
              (gerente) => gerente.cargo === "GERENTE DE LOJA"
            );
            const qtdeGerentesLoja = gerenteLojaList.length;
            if (!qtdeGerentesLoja) {
              throw new Error("Nenhum gerente de loja encontrado");
            }
            let countGL = 1;
            for (const gerente of gerenteLojaList) {
              const percentual = 0.15 / qtdeGerentesLoja;

              await conn.execute(
                `INSERT INTO comissao_vendas_invalidas_rateio
                (id_venda_invalida, id_filial, cpf_colaborador, nome_colaborador, cargo_colaborador, valor, percentual)
                VALUES (?,?,?,?,?,?,?)`,
                [
                  venda.id,
                  filial.id,
                  gerente.cpf,
                  gerente.nome,
                  gerente.cargo,
                  parseFloat(estorno * percentual),
                  percentual,
                ]
              );
              obj[`VALOR GERENTE DE LOJA ${countGL}`] = parseFloat(estorno * percentual);
              obj[`PERCENTUAL GERENTE LOJA ${countGL}`] = percentual;
              countGL++;
            }
          }
          obj["STATUS RATEIO AUTOMÁTICO"] = "OK";
          obj["OBSERVAÇÃO"] = "VINCULADO COM SUCESSO";
        } catch (erro) {
          obj["STATUS RATEIO AUTOMÁTICO"] = "ERRO";
          obj["OBSERVAÇÃO"] = String(erro.message).toUpperCase();
        } finally {
          retorno.push(obj);
        }
      }

      if (!conn_externa) {
        await conn.commit();
      }
      resolve(retorno);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "COMISSIONAMENTO",
        method: "RATEIO_AUTOMATICO_VENDAS_INVALIDAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn && !conn_externa) await conn.rollback();
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
