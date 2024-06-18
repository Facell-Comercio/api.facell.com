const logger = require("../../../../logger");
const { db } = require("../../../../mysql");

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
    const { termo } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const params = [];

    let where = ` WHERE 1=1 `;
    if (termo) {
      params.push(termo);
      params.push(termo);

      where += ` AND (
                fb.nome LIKE CONCAT('%', ?, '%')  OR
                fb.codigo = ?
            )`;
    }

    const offset = pageIndex * pageSize;
    params.push(pageSize);
    params.push(offset);
    const conn = await db.getConnection();
    try {
      const [rowTotal] = await conn.execute(
        `SELECT count(fb.id) as qtde FROM fin_bancos fb
            WHERE 
              fb.nome LIKE CONCAT('%', ?, '%')  OR
              fb.codigo = ?
            `,
        [termo, termo]
      );
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      let query = `
            SELECT * FROM fin_bancos fb
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
        module: "FINANCEIRO",
        origin: "BANCOS",
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
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowFornecedor] = await conn.execute(
        `
            SELECT *
            FROM fin_bancos
            WHERE id = ?
            `,
        [id]
      );
      const fornecedor = rowFornecedor && rowFornecedor[0];
      resolve(fornecedor);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BANCOS",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, ...rest } = req.body;
    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      await conn.beginTransaction();
      let campos = "";
      let values = "";
      const params = [];

      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          campos += ", "; // Adicionar vírgula entre os campos
          values += ", "; // Adicionar vírgula entre os values
        }
        campos += `${key}`;
        values += `?`;
        params.push(String(rest[key]).toUpperCase()); // Adicionar valor do campo ao array de parâmetros
      });

      const query = `INSERT INTO fin_bancos (${campos}) VALUES (${values});`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BANCOS",
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
    const { id, ...rest } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();
      const params = [];
      let updateQuery = "UPDATE fin_bancos SET ";

      // Construir a parte da query para atualização dinâmica
      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          updateQuery += ", "; // Adicionar vírgula entre os campos
        }
        updateQuery += `${key} = ? `;
        params.push(String(rest[key]).toUpperCase()); // Adicionar valor do campo ao array de parâmetros
      });

      params.push(id);

      await conn.execute(
        updateQuery +
          `WHERE id = ?
            `,
        params
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BANCOS",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
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
