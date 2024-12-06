const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { ensureArray } = require("../../../../../helpers/formaters");

module.exports = async (req, res) => {
  let conn;
  let conn_externa = req?.body?.conn_externa;
  try {
    // Filtros
    const { data, filters } = req.body;
    const {
      id,
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
      codigo_cliente,
      plano_atual,
      produto_fidelizado,
      tim_data_consulta,
      id_campanha,

      produto_ofertado,
      vendedor,
    } = data || {};

    const params = [];
    const sets = [];
    let where = " WHERE 1=1 ";

    if (gsm) {
      sets.push(`gsm = ?`);
      params.push(gsm);
    }
    if (gsm_portado) {
      sets.push(`gsm_portado = ?`);
      params.push(gsm_portado);
    }
    if (cpf_cliente) {
      sets.push(`cpf = ?`);
      params.push(cpf_cliente);
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
    if (produto_ofertado) {
      sets.push(`produto_ofertado = ?`);
      params.push(produto_ofertado);
    }
    if (vendedor) {
      sets.push(`vendedor = ?`);
      params.push(vendedor);
    }
    if (id_campanha) {
      sets.push(`id_campanha = ?`);
      params.push(id_campanha);
    }

    //* WHERE
    const { plano_atual_list, produto_list, sem_contato, status_plano_list } = filters || {};
    if (plano_atual_list && plano_atual_list.length > 0) {
      where += ` AND mc.plano_atual IN(${ensureArray(plano_atual_list)
        .map((value) => db.escape(value))
        .join(",")}) `;
    }
    if (produto_list && produto_list.length > 0) {
      where += ` AND mc.produto_ultima_compra IN(${ensureArray(produto_list)
        .map((value) => db.escape(value))
        .join(",")}) `;
    }
    if (status_plano_list && status_plano_list.length > 0) {
      where += ` AND mc.status_plano IN(${ensureArray(status_plano_list)
        .map((value) => db.escape(value))
        .join(",")}) `;
    }
    if (filters.plano_habilitado) {
      where += " AND mc.plano_habilitado = ? ";
      params.push(filters.plano_habilitado);
    }
    if (filters.produto) {
      where += " AND mc.produto =? ";
      params.push(filters.produto);
    }
    if (sem_contato !== undefined && sem_contato !== "all") {
      if (Number(sem_contato)) {
        where += `
          AND NOT EXISTS (
          SELECT 1
          FROM marketing_mailing_interacoes mr
          WHERE mr.id_cliente = mc.id
          )
          `;
      } else {
        where += `
          AND EXISTS (
          SELECT 1
          FROM marketing_mailing_interacoes mr
          WHERE mr.id_cliente = mc.id
          )
          `;
      }
    }
    if (produto_fidelizado !== undefined && produto_fidelizado !== "all") {
      where += " AND mc.produto_fidelizado =? ";
      params.push(filters.produto_fidelizado);
    }
    if (filters.id_campanha) {
      where += " AND mc.id_campanha =? ";
      params.push(filters.id_campanha);
    }

    if (sets.length === 0) {
      throw new Error("Nenhum campo foi passado para atualização!");
    }
    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();

    let query = `UPDATE marketing_mailing_clientes mc SET ${sets.join(",")} ${where}`;

    await conn.execute(query, params);

    // await conn.rollback();
    if (!conn_externa) {
      await conn.commit();
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "UPDATE_CLIENTE_CAMPANHA_LOTE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
