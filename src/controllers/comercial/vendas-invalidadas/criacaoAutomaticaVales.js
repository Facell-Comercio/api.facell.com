const { formatDate } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { conn_externa } = req.body;
    let conn;
    try {
      const { ref, id_venda_invalida } = req.body;
      const user = req.user;
      const params = [];
      let where = "WHERE 1 = 1 ";

      if (ref) {
        where += ` AND vi.ref =? `;
        params.push(ref.split("T")[0]);
      }

      if (id_venda_invalida) {
        where += ` AND vi.id =? `;
        params.push(id_venda_invalida);
      }

      conn = conn_externa || (await db.getConnection());
      await conn.beginTransaction();

      const [rateios] = await conn.execute(
        `SELECT
          vi.*, vir.*, vir.id as id_rateio,
          MONTH(vi.ref) as mes, YEAR(vi.ref) as ano
        FROM comissao_vendas_invalidas vi
        LEFT JOIN comissao_vendas_invalidas_rateio vir ON vir.id_venda_invalida = vi.id
        ${where}
        AND vi.status IN (improcedente','ciente')
        AND vi.estorno > 0
        AND vir.id_vale IS NULL
        AND vir.id IS NOT NULL`,
        params
      );

      if (!rateios.length) {
        throw new Error("Nenhum rateio encontrado");
      }

      const retorno = [];

      for (const rateio of rateios) {
        let obj = {
          REF: rateio.ref,
          FILIAL: rateio.filial,
          TIPO: rateio.tipo,
          SEGMENTO: rateio.segmento,
          MOTIVO: rateio.motivo,
          "DATA VENDA": rateio.data_venda,
          PEDIDO: rateio.pedido,
          GSM: rateio.gsm,
          IMEI: rateio.imei,
          "CPF COLABORARDOR": rateio.cpf_colaborador,
          "NOME COLABORADOR": rateio.nome_colaborador,
          VALOR: rateio.valor,
        };
        try {
          const [result] = await conn.execute(
            `
            INSERT INTO vales (
              data_inicio_cobranca,
              id_filial,
              valor,
              saldo,
              origem,
              parcelas,
              parcela,
              obs,
              cpf_colaborador,
              nome_colaborador,
              id_criador
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
            `,
            [
              new Date(),
              rateio.id_filial,
              rateio.valor,
              rateio.valor,
              "AUDITORIA QUALIDADE",
              1,
              1,
              `FOLHA DE COMISSÃO REF. ${rateio.mes}/${rateio.ano}`,
              rateio.cpf_colaborador,
              rateio.nome_colaborador,
              user.id,
            ]
          );

          await conn.execute(
            "UPDATE comissao_vendas_invalidas_rateio SET id_vale = ? WHERE id = ?",
            [result.insertId, rateio.id_rateio]
          );
          obj["ID VALE"] = result.insertId;
          obj["STATUS"] = "OK";
          obj["OBSERVAÇÃO"] = "CRIADO COM SUCESSO";
        } catch (erro) {
          obj["STATUS"] = "ERRO";
          obj["OBSERVAÇÃO"] = String(erro.message).toUpperCase();
          // console.log(erro);
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
        method: "CRIACAO_AUTOMATICA_VALES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn && !conn_externa) await conn.rollback();
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
