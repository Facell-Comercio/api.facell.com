const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    let conn_externa = req?.body?.conn_externa;
    try {
      const {
        //* WHERE
        gsm,
        cpf_cliente,

        //* SETS
        gsm_portado,
        cliente, // Nome do cliente
        desconto_plano,
        status_plano,
        fidelizacao1,
        data_expiracao_fid1,
        fidelizacao2,
        data_expiracao_fid2,
        fidelizacao3,
        data_expiracao_fid3,
        codigo_cliente,
        plano_atual,
        produto_fidelizado,
        tim_data_consulta,
      } = req.body;

      const params = [];
      let sets = [];
      let where = " WHERE status_plano <> 'Desativado' ";

      if (gsm_portado) {
        sets.push(`gsm_portado = ?`);
        params.push(gsm_portado);
      }
      if (cliente) {
        sets.push(`cliente = ?`);
        params.push(cliente);
      }
      if (desconto_plano) {
        sets.push(`desconto_plano = ?`);
        params.push(desconto_plano);
      }
      if (status_plano) {
        sets.push(`status_plano = ?`);
        params.push(status_plano);
      }
      if (fidelizacao1) {
        sets.push(`fidelizacao1 = ?`);
        params.push(fidelizacao1);
      }
      if (data_expiracao_fid1) {
        sets.push(`data_expiracao_fid1 = ?`);
        params.push(data_expiracao_fid1);
      }
      if (fidelizacao2) {
        sets.push(`fidelizacao2 = ?`);
        params.push(fidelizacao2);
      }
      if (data_expiracao_fid2) {
        sets.push(`data_expiracao_fid2 = ?`);
        params.push(data_expiracao_fid2);
      }
      if (fidelizacao3) {
        sets.push(`fidelizacao3 = ?`);
        params.push(fidelizacao3);
      }
      if (data_expiracao_fid3) {
        sets.push(`data_expiracao_fid3 = ?`);
        params.push(data_expiracao_fid3);
      }
      if (codigo_cliente) {
        sets.push(`codigo_cliente = ?`);
        params.push(codigo_cliente);
      }
      if (plano_atual) {
        sets.push(`plano_atual = ?`);
        params.push(plano_atual);
      }
      if (produto_fidelizado !== undefined) {
        sets.push(`produto_fidelizado = ?`);
        params.push(produto_fidelizado);
      }
      if (tim_data_consulta) {
        sets.push(`tim_data_consulta = ?`);
        params.push(tim_data_consulta);
      }

      //* VALIDAÇÕES
      if (!gsm && !cpf_cliente) {
        throw new Error("GSM ou CPF do cliente não informados!");
      }

      //* WHERE
      if (gsm) {
        where += ` AND gsm = ? `;
        params.push(gsm);
      }
      if (cpf_cliente) {
        where += ` AND cpf = ? `;
        params.push(cpf_cliente);
      }
      if (sets.length === 0) {
        throw new Error("Nenhum campo foi passado para atualização!");
      }
      conn = conn_externa || (await db.getConnection());
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE marketing_mailing_compras SET ${sets.join(",")} ${where}`,
        params
      );

      if (!conn_externa) {
        await conn.commit();
      }
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "UPDATE_CLIENTE_MARKETING_COMPRAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn && !conn_externa) await conn.rollback();
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
