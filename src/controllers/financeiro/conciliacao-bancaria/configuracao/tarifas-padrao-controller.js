const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { filters, pagination } = req.query;
    const { id_matriz } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    const params = [];

    let where = ` WHERE 1=1 `;
    if (id_matriz) {
      where += ` AND ge.id_matriz = ? `;
      params.push(id_matriz);
    }

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
            SELECT
                tp.id, tp.descricao,
                ge.nome as grupo_economico,
                cc.nome as centro_custo,
                CONCAT(pc.codigo, " - ", pc.descricao) as plano_contas
            FROM fin_tarifas_padrao tp
            LEFT JOIN grupos_economicos ge ON ge.id = tp.id_grupo_economico 
            LEFT JOIN fin_centros_custo cc ON cc.id = tp.id_centro_custo 
            LEFT JOIN fin_plano_contas pc ON pc.id = tp.id_plano_contas
            ${where}
        ) AS subconsulta
        `,
        params
      );
      const totalTarifas = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      const [tarifas] = await conn.execute(
        `
        SELECT
            tp.id, tp.descricao,
            ge.nome as grupo_economico,
            cc.nome as centro_custo,
            CONCAT(pc.codigo, " - ", pc.descricao) as plano_contas
        FROM fin_tarifas_padrao tp
        LEFT JOIN grupos_economicos ge ON ge.id = tp.id_grupo_economico 
        LEFT JOIN fin_centros_custo cc ON cc.id = tp.id_centro_custo 
        LEFT JOIN fin_plano_contas pc ON pc.id = tp.id_plano_contas 

        ${where}
        LIMIT ? OFFSET ?`,
        params
      );

      const objResponse = {
        rows: tarifas,
        pageCount: Math.ceil(totalTarifas / pageSize),
        rowCount: totalTarifas,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIAÇÃO BANCÁRIA - CONFIGURAÇÃO",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { id } = req.params || {};

    const conn = await db.getConnection();
    try {
      const [rowTarifas] = await conn.execute(
        `
        SELECT
            tp.*,
            ge.nome as grupo_economico,
            cc.nome as centro_custo,
            CONCAT(pc.codigo, " - ", pc.descricao) as plano_contas,
            ge.id_matriz
        FROM fin_tarifas_padrao tp
        LEFT JOIN grupos_economicos ge ON ge.id = tp.id_grupo_economico 
        LEFT JOIN fin_centros_custo cc ON cc.id = tp.id_centro_custo 
        LEFT JOIN fin_plano_contas pc ON pc.id = tp.id_plano_contas 

        WHERE tp.id = ?`,
        [id]
      );

      const tarifa = rowTarifas && rowTarifas[0];
      resolve(tarifa);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIAÇÃO BANCÁRIA - CONFIGURAÇÃO",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function insert(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_grupo_economico,
      id_centro_custo,
      id_plano_contas,
      descricao,
    } = req.body || {};
    if (id) {
      throw new Error(
        "ID passado, a operação que deve ser realizada é um UPDATE e não um INSERT!"
      );
    }
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `
          INSERT INTO fin_tarifas_padrao (
            id_grupo_economico,
            id_centro_custo,
            id_plano_contas,
            descricao
          ) VALUES (?,?,?,?)
            `,
        [
          id_grupo_economico,
          id_centro_custo,
          id_plano_contas,
          String(descricao).trim(),
        ]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIAÇÃO BANCÁRIA - CONFIGURAÇÃO",
        method: "INSERT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_grupo_economico,
      id_centro_custo,
      id_plano_contas,
      descricao,
    } = req.body || {};

    if (!id) {
      throw new Error("ID da tarifa não informado!");
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `
            UPDATE fin_tarifas_padrao
            SET id_grupo_economico = ?,
                id_centro_custo = ?,
                id_plano_contas = ?,
                descricao = ?
            WHERE id = ?
      `,
        [
          id_grupo_economico,
          id_centro_custo,
          id_plano_contas,
          String(descricao).trim(),
          id,
        ]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIAÇÃO BANCÁRIA - CONFIGURAÇÃO",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function deleteOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params || {};

    if (!id) {
      throw new Error("ID da tarifa não informado!");
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `DELETE FROM fin_tarifas_padrao WHERE id = ? LIMIT 1`,
        [id]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIAÇÃO BANCÁRIA - CONFIGURAÇÃO",
        method: "DELETE_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insert,
  update,
  deleteOne,
};
