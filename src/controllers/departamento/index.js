const { logger } = require("../../../logger");
const { db } = require("../../../mysql");
const { checkUserDepartment } = require("../../helpers/checkUserDepartment");
const { hasPermission } = require("../../helpers/hasPermission");

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
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { termo } = filters || { termo: null };

    var where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND d.nome LIKE CONCAT('%', ?, '%')`;
      params.push(termo);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(d.id) as qtde 
            FROM departamentos d
             ${where} `,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT d.* FROM departamentos d
            ${where}
            ORDER BY d.id DESC
            LIMIT ? OFFSET ?
            `;
      // console.log(query)
      // console.log(params)
      const [rows] = await conn.execute(query, params);

      // console.log('Fetched departamentos', departamentos.length)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "DEPARTAMENTOS",
        method: "GER_ALL",
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
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowDepartamentos] = await conn.execute(
        `
            SELECT *
            FROM departamentos
            WHERE id = ?
            `,
        [id]
      );
      const departamentos = rowDepartamentos && rowDepartamentos[0];
      resolve(departamentos);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "DEPARTAMENTOS",
        method: "GER_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getUserDepartamentos(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const conn = await db.getConnection();
    var where = ` WHERE 1=1 AND ud.id IS NOT NULL `;
    //^ Somente o Financeiro/Master podem ver todos
    if (!checkUserDepartment(req, "FINANCEIRO") && !hasPermission(req, "MASTER")) {
      where += ` AND ud.id_user = '${user.id}' `;
    }

    try {
      const [rowDepartamentos] = await conn.execute(
        `
            SELECT DISTINCT d.id, d.nome
            FROM departamentos d
            LEFT JOIN users_departamentos ud ON d.id = ud.id_departamento
            ${where}
            `
      );
      resolve(rowDepartamentos);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "DEPARTAMENTOS",
        method: "GER_USER_DEPARTAMENTOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome, active } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID do usuário não enviado!");
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      await conn.beginTransaction();

      // Atualização de dados do usuário
      await conn.execute("UPDATE departamentos SET nome = ?, active = ? WHERE id = ?", [
        nome,
        active,
        id,
      ]);

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "DEPARTAMENTOS",
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

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome } = req.body;
    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      await conn.beginTransaction();
      let campos = "nome";
      let values = "";
      let params = [nome];

      const query = `INSERT INTO departamentos (${campos}) VALUES (?);`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "DEPARTAMENTOS",
        method: "INSERT_ONE",
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
  getUserDepartamentos,
  update,
  insertOne,
};
