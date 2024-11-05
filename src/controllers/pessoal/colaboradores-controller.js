const { logger } = require("../../../logger");
const { db } = require("../../../mysql");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters, pagination } = req.query;
    const { nome, cpf, active, termo } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const params = [];

    let where = ` WHERE 1=1 `;
    if (nome) {
      where += ` AND c.nome LIKE CONCAT('%',?, '%') `;
      params.push(nome);
    }
    if (cpf) {
      where += ` AND c.cpf LIKE CONCAT(?, '%') `;
      params.push(cpf);
    }
    if (active !== undefined) {
      where += ` AND c.active = ? `;
      params.push(active);
    }
    if (termo) {
      where += ` AND (c.nome LIKE CONCAT('%',?, '%') OR c.cpf LIKE CONCAT(?, '%')) `;
      params.push(termo);
      params.push(termo);
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [rowTotal] = await conn.execute(
        `SELECT count(c.id) as qtde FROM colabs c
        ${where}
        `,
        params
      );

      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      const offset = pageIndex * pageSize;
      params.push(pageSize);
      params.push(offset);

      let query = `
        SELECT * FROM colabs c
        ${where}
        LIMIT ? OFFSET ?
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
        module: "PESSOAL",
        origin: "COLABORADORES",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    let conn;
    try {
      conn = await db.getConnection();
      const [rowColaborador] = await conn.execute(
        `
            SELECT *
            FROM colabs
            WHERE id = ?
            `,
        [id]
      );
      const colaborador = rowColaborador && rowColaborador[0];
      resolve(colaborador);
      return;
    } catch (error) {
      logger.error({
        module: "PESSOAL",
        origin: "COLABORADORES",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome, cpf, active } = req.body;
    let conn;
    try {
      conn = await db.getConnection();
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!nome) {
        throw new Error("É necessário informar o nome!");
      }
      if (!cpf) {
        throw new Error("É necessário informar o CPF!");
      }

      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO colabs (
            nome, cpf, active
        ) VALUES (?,?,?)`,
        [nome, cpf, active]
      );
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "PESSOAL",
        origin: "COLABORADORES",
        method: "INSERT_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome, cpf, active } = req.body;
    let conn;
    // console.log(req.body);
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!nome) {
        throw new Error("É necessário informar o nome!");
      }
      if (!cpf) {
        throw new Error("É necessário informar o CPF!");
      }
      await conn.beginTransaction();
      await conn.execute(
        `
        UPDATE colabs SET
            nome = ?, cpf = ?, active = ?
        WHERE id = ?`,
        [nome, cpf, active, id]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      logger.error({
        module: "PESSOAL",
        origin: "COLABORADORES",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
};
