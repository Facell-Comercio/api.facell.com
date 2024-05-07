const { db } = require("../../../../mysql");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const conn = await db.getConnection();
    try {
      var query = `SELECT ffp.id, ffp.forma_pagamento FROM fin_formas_pagamento ffp ORDER BY ffp.id DESC`;
      // console.log(query)
      // console.log(params)
      const [rows] = await conn.execute(query);
      resolve(rows);
    } catch (error) {
      reject(error);
    } finally {
      await conn.release();
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowFormaPagamento] = await conn.execute(
        `
            SELECT *
            FROM fin_formas_pagamento
            WHERE id = ?
            `,
        [id]
      );
      const formaPagamento = rowFormaPagamento && rowFormaPagamento[0];
      resolve(formaPagamento);
      return;
    } catch (error) {
      reject(error);
      return;
    } finally {
      await conn.release();
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
      const campos = "";
      const values = "";
      const params = [];

      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          campos += ", "; // Adicionar vírgula entre os campos
          values += ", "; // Adicionar vírgula entre os values
        }
        campos += `${key}`;
        campos += `?`;
        params.push(rest[key]); // Adicionar valor do campo ao array de parâmetros
      });

      const query = `INSERT INTO fin_formas_pagamento (${campos}) VALUES (${values});`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      await conn.rollback();
      reject(error);
    } finally {
      await conn.release();
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
      let updateQuery = "UPDATE fin_formas_pagamento SET ";

      // Construir a parte da query para atualização dinâmica
      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          updateQuery += ", "; // Adicionar vírgula entre os campos
        }
        updateQuery += `${key} = ?`;
        params.push(rest[key]); // Adicionar valor do campo ao array de parâmetros
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
      await conn.rollback();
      reject(error);
      return;
    } finally {
      await conn.release();
    }
  });
}

function toggleActive(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.query;
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE fin_formas_pagamento SET active = NOT active WHERE id = ?`,
        [id]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      await conn.rollback();
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  toggleActive,
};
