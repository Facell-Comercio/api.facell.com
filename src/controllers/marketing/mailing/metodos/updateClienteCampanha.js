const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const updateClienteMarketingCompras = require('./updateClienteMarketingCompras');

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const {
      conn_externa,

      id_cliente,
      gsm,
      gsm_portado,
      cpf_cliente,
      cliente, // Nome do cliente
      desconto_plano,
      status_plano,
      fidelizacao1,
      data_expiracao_fid1,
      fidelizacao2,
      data_expiracao_fid2,
      fidelizacao3,
      data_expiracao_fid3,
      codigo,
      plano_atual,
      produto_fidelizado,
      tim_data_consulta,

      produto_ofertado,
      vendedor,
    } = req.body;

    const params = [];
    let sets = "";
    if (gsm) {
      sets += ` gsm = ? `;
      params.push(gsm);
    }
    if (gsm_portado) {
      sets += ` gsm_portado = ? `;
      params.push(gsm_portado);
    }
    if (cpf_cliente) {
      sets += ` cpf = ? `;
      params.push(cpf_cliente);
    }
    if (cliente) {
      sets += ` cliente = ? `;
      params.push(cliente);
    }
    if (desconto_plano) {
      sets += `desconto_plano = ?`;
      params.push(desconto_plano);
    }
    if (status_plano) {
      sets += ` status_plano = ? `;
      params.push(status_plano);
    }
    if (fidelizacao1) {
      sets += ` fidelizacao1 = ? `;
      params.push(fidelizacao1);
    }
    if (data_expiracao_fid1) {
      sets += ` data_expiracao_fid1 = ? `;
      params.push(data_expiracao_fid1);
    }
    if (fidelizacao2) {
      sets += ` fidelizacao2 = ? `;
      params.push(fidelizacao2);
    }
    if (data_expiracao_fid2) {
      sets += ` data_expiracao_fid2 = ? `;
      params.push(data_expiracao_fid2);
    }
    if (fidelizacao3) {
      sets += ` fidelizacao3 = ? `;
      params.push(fidelizacao3);
    }
    if (data_expiracao_fid3) {
      sets += ` data_expiracao_fid3 = ? `;
      params.push(data_expiracao_fid3);
    }
    if (codigo) {
      sets += ` codigo = ? `;
      params.push(codigo);
    }
    if (plano_atual) {
      sets += ` plano_atual = ? `;
      params.push(plano_atual);
    }
    if (produto_fidelizado) {
      sets += ` produto_fidelizado = ? `;
      params.push(produto_fidelizado);
    }
    if (tim_data_consulta) {
      sets += ` tim_data_consulta = ? `;
      params.push(tim_data_consulta);
    }
    if (produto_ofertado) {
      sets += ` produto_ofertado = ? `;
      params.push(produto_ofertado);
    }
    if (vendedor) {
      sets += ` vendedor = ? `;
      params.push(vendedor);
    }

    //* ID CLIENTE
    params.push(id_cliente);

    let conn;

    try {
      conn = conn_externa || (await db.getConnection());
      await conn.beginTransaction();

      await conn.execute(`UPDATE marketing_mailing_clientes SET ${sets} WHERE id = ?`, params);
      await updateClienteMarketingCompras({
        body: {

        }
      })
      if (!conn_externa) {
        await conn.commit();
      }
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "UPDATE_CLIENTE_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
