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
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { estabelecimento, num_maquina, id_filial, active } = filters || {};

    const params = [];
    var where = ` WHERE 1=1 `;

    if (id_filial) {
      where += ` AND fe.id_filial = ? `;
      params.push(id_filial);
    }

    if (estabelecimento) {
      where += ` AND fe.estabelecimento LIKE CONCAT(?,'%') `;
      params.push(estabelecimento);
    }

    if (num_maquina) {
      where += ` AND fe.num_maquina LIKE CONCAT(?,'%') `;
      params.push(num_maquina);
    }

    if (active) {
      where += ` AND fe.active = ? `;
      params.push(active);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowTotal] = await conn.execute(
        `SELECT 
          COUNT(fe.id) as qtde 
          FROM fin_equipamentos_cielo as fe
          LEFT JOIN filiais as f ON fe.id_filial = f.id
          ${where}
            `,
        params
      );
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);

      var query = `
            SELECT fe.*, f.apelido as filial FROM fin_equipamentos_cielo fe
            LEFT JOIN filiais f ON fe.id_filial = f.id
            ${where}
            ORDER BY fe.id DESC
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
      const [rowFornecedor] = await conn.execute(
        `
            SELECT *
            FROM fin_equipamentos_cielo fe
            WHERE id = ?
            `,
        [id]
      );
      const fornecedor = rowFornecedor && rowFornecedor[0];
      resolve(fornecedor);
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
      let campos = "";
      let values = "";
      const params = [];

      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          campos += ", ";
          values += ", ";
        }
        campos += `${key}`;
        values += `?`;
        params.push(rest[key]);
      });

      const query = `INSERT INTO fin_equipamentos_cielo (${campos}) VALUES (${values});`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_RATEIOS_INSERT", error);
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
      let updateQuery = "UPDATE fin_equipamentos_cielo SET ";

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
          ` WHERE id = ?
        `,
        params
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_RATEIOS_UPDATE", error);
      await conn.rollback();
      reject(error);
    } finally {
      await conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
};
