const {logger} = require("../../../../logger");
const { db } = require("../../../../mysql");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { active, id_grupo_economico, nome, codigo } = filters || {};
    var where = ` WHERE 1=1 `;
    const params = [];

    if (nome) {
      where += ` AND fr.nome LIKE CONCAT(?,'%') `;
      params.push(nome);
    }
    if (codigo) {
      where += ` AND fr.codigo LIKE CONCAT(?,'%') `;
      params.push(codigo);
    }
    if (id_grupo_economico) {
      where += ` AND fr.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (active) {
      where += ` AND fr.active = ? `;
      params.push(active);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(fr.id) as qtde  
            FROM fin_rateio fr
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT fr.id, fr.id_grupo_economico, fr.nome, fr.codigo, fr.active, ge.apelido as grupo_economico FROM fin_rateio fr
            LEFT JOIN grupos_economicos ge ON fr.id_grupo_economico = ge.id
            ${where}
            ORDER BY fr.id DESC
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
        origin: "RATEIOS",
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

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowRateios] = await conn.execute(
        `
        SELECT 
        fr.id, 
        fr.id_grupo_economico, 
        fr.nome, 
        fr.codigo, 
        fr.active,
        fr.manual
    FROM fin_rateio fr
    WHERE fr.id = ?
            `,
        [id]
      );
      const rateios = rowRateios && rowRateios[0];
      const [rowRateioItens] = await conn.execute(
        `
            SELECT 
              fri.id as id_item, 
              fri.id_filial, 
              f.nome as filial,
              FORMAT(fri.percentual * 100, 4) as percentual 
            FROM fin_rateio_itens fri
            LEFT JOIN fin_rateio fr ON fri.id_rateio = fr.id
            INNER JOIN filiais f ON f.id = fri.id_filial
            WHERE fr.id = ?
            `,
        [id]
      );
      resolve({ ...rateios, itens: rowRateioItens });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "RATEIOS",
        method: "GET_ONE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
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
    const { active, id_grupo_economico, nome, codigo, manual, itens } =
      req.body;

    const conn = await db.getConnection();
    try {
      if (!id_grupo_economico) {
        throw new Error("ID_GRUPO_ECONOMICO não informado!");
      }
      if (!nome) {
        throw new Error("NOME não informado!");
      }
      if (!codigo) {
        throw new Error("CODIGO não informado!");
      }
      if (!manual && !itens?.length) {
        throw new Error("ITENS não informados!");
      }
      if (manual === undefined) {
        throw new Error("MANUAL não informado!");
      }
      await conn.beginTransaction();

      // Insert do rateio
      const [result] = await conn.execute(
        `INSERT INTO fin_rateio (id_grupo_economico, nome, codigo, manual, active) VALUES (?,?,?,?,?)`,
        [id_grupo_economico, nome, codigo, manual, active]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      // Inserir os itens do rateio
      if (!manual) {
        itens.forEach(async ({ id_filial, percentual }) => {
          await conn.execute(
            `INSERT INTO fin_rateio_itens (id_rateio, id_filial, percentual) VALUES(?,?,?)`,
            [newId, id_filial, percentual]
          ); //! ORDEM NÃO TEM DEFAULT
        });
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "RATEIOS",
        method: "INSERT",
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

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, active, id_grupo_economico, nome, codigo, manual, itens } =
      req.body;
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("ID_GRUPO_ECONOMICO não informado!");
      }
      if (!nome) {
        throw new Error("NOME não informado!");
      }
      if (!codigo) {
        throw new Error("CODIGO não informado!");
      }
      if (!manual && !itens?.length) {
        throw new Error("ITENS não informados!");
      }
      if (manual === undefined) {
        throw new Error("MANUAL não informado!");
      }
      await conn.beginTransaction();

      // Update do rateio
      await conn.execute(
        `UPDATE fin_rateio SET id_grupo_economico = ?, nome = ?, codigo = ?, manual =?, active = ? WHERE id =?`,
        [id_grupo_economico, nome, codigo, manual, active, id]
      );

      if (manual) {
        // Deletar os itens anteriores
        await conn.execute(`DELETE FROM fin_rateio_itens WHERE id_rateio =?`, [
          id,
        ]);
      }
      // Inserir os itens do rateio
      if (!manual) {
        for (const item of itens) {
          if (item.id_item) {
            await conn.execute(
              `UPDATE fin_rateio_itens SET id_filial = ?, percentual = ? WHERE id =?`,
              [item.id_filial, item.percentual, item.id_item]
            );
          } else {
            await conn.execute(
              `INSERT INTO fin_rateio_itens (id_rateio, id_filial, percentual) VALUES(?,?,?)`,
              [id, item.id_filial, item.percentual]
            );
          }
        }
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "RATEIOS",
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

function deleteOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();

      await conn.execute(`DELETE FROM fin_rateio_itens WHERE id = ?`, [id]);

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "RATEIOS",
        method: "DELETE_ONE",
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

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  deleteOne,
};
