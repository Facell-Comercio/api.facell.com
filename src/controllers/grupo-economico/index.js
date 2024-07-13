const { logger } = require("../../../logger");
const { db } = require("../../../mysql");
const { checkUserPermission } = require("../../helpers/checkUserPermission");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = checkUserPermission(req, "MASTER");

    const grupos_economicos_habilitados = [];

    user?.filiais?.forEach((f) => {
      grupos_economicos_habilitados.push(f.id_filial);
    });

    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const offset = pageIndex * pageSize;

    const { id_matriz, termo } = filters || { id_matriz: null };

    var where = ` WHERE 1=1 `;
    var limit = pagination ? " LIMIT ? OFFSET ? " : "";

    const params = [];

    if (!isMaster) {
      if (
        !grupos_economicos_habilitados ||
        grupos_economicos_habilitados.length === 0
      ) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND f.id IN(${grupos_economicos_habilitados.join(",")}) `;
    }

    if (id_matriz) {
      where += ` AND g.id_matriz = ?`;
      params.push(id_matriz);
    }
    if (termo) {
      where += `AND g.nome LIKE CONCAT('%',?,'%')`;
      params.push(termo);
    }
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(g.id) as qtde 
            FROM grupos_economicos g
            JOIN filiais f ON f.id = g.id_matriz
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const query = `
            SELECT g.*, f.nome as matriz FROM grupos_economicos g
            JOIN filiais f ON f.id = g.id_matriz
            ${where}
            ORDER BY g.id DESC
            ${limit}
            `;

      const [rows] = await conn.execute(query, params);
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "GRUPO ECONÔMICO",
        method: "GET_ALL",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getAllMatriz(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = checkUserPermission(req, "MASTER");

    const grupos_economicos_habilitados = [];

    user?.filiais?.forEach((f) => {
      grupos_economicos_habilitados.push(f.id);
    });

    let where = ` WHERE 1=1 `;

    if (!isMaster) {
      if (
        !grupos_economicos_habilitados ||
        grupos_economicos_habilitados.length === 0
      ) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND f.id IN(${grupos_economicos_habilitados.join(",")}) `;
    }

    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `
        SELECT 
          f.id_matriz as id, 
          CASE WHEN f.id_matriz = 18 THEN f.nome ELSE ge.nome END as nome  
        FROM filiais f
        LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
        ${where}
        GROUP BY f.id_matriz`
      );
      const objResponse = {
        rows: rows,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "GRUPO ECONÔMICO",
        method: "GET_ALL_MATRIZ",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowPlanoContas] = await conn.execute(
        `
            SELECT *
            FROM grupos_economicos
            WHERE id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];
      resolve(planoContas);
      return;
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "GRUPO ECONÔMICO",
        method: "GET_ONE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome, apelido, id_matriz, active, orcamento } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID do usuário não enviado!");
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      await conn.beginTransaction();

      const set = [];
      const params = [];

      if (nome !== undefined) {
        set.push("nome = ?");
        params.push(nome);
      }
      if (apelido !== undefined) {
        set.push("apelido = ?");
        params.push(apelido);
      }
      if (active !== undefined) {
        set.push("active = ?");
        params.push(active);
      }
      if (orcamento !== undefined) {
        set.push("orcamento = ?");
        params.push(orcamento);
      }
      if (id_matriz !== undefined) {
        set.push("id_matriz = ?");
        params.push(id_matriz);
      }

      // Atualização de dados
      params.push(id);
      await conn.execute(
        `UPDATE grupos_economicos SET ${set.join(",")} WHERE id = ?`,
        params
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "GRUPO ECONÔMICO",
        method: "UPDATE",
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
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome, apelido } = req.body;
    const conn = await db.getConnection();
    try {
      conn.beginTransaction();
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      let campos = "nome";
      let values = "";
      let params = [nome];

      const query = `INSERT INTO grupos_economicos (${campos}) VALUES (?);`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "GRUPO ECONÔMICO",
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

module.exports = {
  getAll,
  getAllMatriz,
  getOne,
  update,
  insertOne,
};
