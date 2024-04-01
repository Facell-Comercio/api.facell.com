const { db } = require("../../../mysql");
const { param } = require("../../routes/financeiro/centro-custos");

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
    const { nome, id_grupo_economico, ativo } = filters || {};
    console.log(filters);
    // const { id_filial, termo } = filters || {id_filial: 1, termo: null}

    var where = ` WHERE 1=1 `;
    const params = [];

    if (nome) {
      where += ` AND cc.nome LIKE CONCAT(?,'%')`;
      params.push(nome);
    }
    if (id_grupo_economico) {
      where += ` AND cc.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (ativo) {
      where += ` AND cc.ativo = ? `;
      params.push(ativo);
    }

    const offset = pageIndex * pageSize;

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT 
            COUNT(cc.id) as qtde 
            FROM fin_centros_custo as cc
            LEFT JOIN grupos_economicos gp ON gp.id = cc.id_grupo_economico
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT cc.*, gp.nome as grupo_economico FROM fin_centros_custo as cc
            LEFT JOIN 
            grupos_economicos gp ON gp.id = cc.id_grupo_economico 
            ${where}
            LIMIT ? OFFSET ?
            `;

      console.log(params);
      const [rows] = await db.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
      console.log(query, params);
    } catch (error) {
      console.log(error);
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
            SELECT cc.* FROM fin_centros_custo as cc
            LEFT JOIN 
            grupos_economicos gp ON gp.id = cc.id_grupo_economico 
            WHERE cc.id = ?
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
      let params = [];

      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          campos += ", "; // Adicionar vírgula entre os campos
          values += ", "; // Adicionar vírgula entre os values
        }
        campos += `${key}`;
        values += `?`;
        params.push(
          typeof rest[key] == "string"
            ? rest[key].trim() || null
            : rest[key] ?? null
        ); // Adicionar valor do campo ao array de parâmetros
      });

      const query = `INSERT INTO fin_centros_custo (${campos}) VALUES (${values});`;

      await db.execute(query, params);
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log(error);
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
      let updateQuery = "UPDATE fin_centros_custo SET ";

      // Construir a parte da query para atualização dinâmica
      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          updateQuery += ", "; // Adicionar vírgula entre os campos
        }
        updateQuery += `${key} = ? `;
        params.push(
          typeof rest[key] == "string"
            ? rest[key].trim() || null
            : rest[key] ?? null
        ); // Adicionar valor do campo ao array de parâmetros
      });

      params.push(id);

      await db.execute(updateQuery + " WHERE id = ?", params);

      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
};
