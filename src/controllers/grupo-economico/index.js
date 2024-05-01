const { db } = require("../../../mysql");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const offset = pageIndex * pageSize;

    const { id_matriz } = filters || { id_matriz: null };

    var where = ` WHERE 1=1 `;
    var limit = pagination ? " LIMIT ? OFFSET ? " : "";

    const params = [];

    if (id_matriz) {
      where += ` AND g.id_matriz = ?`;
      params.push(id_matriz);
    }

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT 
            COUNT(g.id) as qtde 
            FROM grupos_economicos g
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      var query = `
            SELECT g.*, f.nome as matriz FROM grupos_economicos g
            JOIN filiais f ON f.id = g.id_matriz
            ${where}
            ORDER BY g.id DESC
            ${limit}
            `;
      const [rows] = await db.execute(query, params);
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      reject(error);
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    try {
      const [rowPlanoContas] = await db.execute(
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
      reject(error);
      return;
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome, apelido, id_matriz, active } = req.body;

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
      if (id_matriz !== undefined) {
        set.push("id_matriz = ?");
        params.push(id_matriz);
      }

      // Atualização de dados
      params.push(id);
      await conn.execute(
        `UPDATE filiais SET ${set.join(",")} WHERE id = ?`,
        params
      );

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      await conn.rollback();
      console.log("ERRO_GRUPO_ECONOMICO_UPDATE", error);
      reject(error);
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, nome, apelido } = req.body;
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      let campos = "nome";
      let values = "";
      let params = [nome];

      const query = `INSERT INTO grupos_economicos (${campos}) VALUES (?);`;

      await db.execute(query, params);
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_GRUPO_ECONOMICO_INSERT", error);
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  update,
  insertOne,
};
