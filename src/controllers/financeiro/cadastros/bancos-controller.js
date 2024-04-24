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
                fb.codigo LIKE CONCAT('%', ?, '%')
            )`;
    }

    const offset = pageIndex * pageSize;
    params.push(pageSize);
    params.push(offset);
    try {
      const [rowTotal] = await db.execute(
        `SELECT count(fb.id) as qtde FROM fin_bancos fb
            WHERE 
              fb.nome LIKE CONCAT('%', ?, '%')  OR
              fb.codigo LIKE CONCAT('%', ?, '%')
            `,
        [termo, termo]
      );
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      let query = `
            SELECT * FROM fin_bancos fb
            ${where}
            
            LIMIT ? OFFSET ?
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
      const [rowFornecedor] = await db.execute(
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
      reject(error);
      return;
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, ...rest } = req.body;
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
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
        params.push(rest[key]); // Adicionar valor do campo ao array de parâmetros
      });

      const query = `INSERT INTO fin_bancos (${campos}) VALUES (${values});`;

      await db.execute(query, params);
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_EQUIPAMENTOS_INSERT", error);
      reject(error);
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, ...rest } = req.body;
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      const params = [];
      let updateQuery = "UPDATE fin_bancos SET ";

      // Construir a parte da query para atualização dinâmica
      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          updateQuery += ", "; // Adicionar vírgula entre os campos
        }
        updateQuery += `${key} = ? `;
        params.push(rest[key]); // Adicionar valor do campo ao array de parâmetros
      });

      params.push(id);

      await db.execute(
        updateQuery +
          `WHERE id = ?
            `,
        params
      );

      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      console.log("ERRO_EQUIPAMENTOS_UPDATE", error);
      reject(error);
      return;
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
};
