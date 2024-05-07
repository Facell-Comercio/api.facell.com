const { db } = require("../../../../mysql");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = checkUserPermission(req, "MASTER");

    const centros_custo_habilitados = [];

    user?.centros_custo?.forEach((ucc) => {
      centros_custo_habilitados.push(ucc.id);
    });

    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { nome, id_grupo_economico, ativo, id_matriz, termo } = filters || {};

    let where = ` WHERE 1=1 `;
    const params = [];

    if (!isMaster) {
      if (
        !centros_custo_habilitados ||
        centros_custo_habilitados.length === 0
      ) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND cc.id IN(${centros_custo_habilitados.join(",")}) `;
    }

    if (nome) {
      where += ` AND cc.nome LIKE CONCAT(?,'%')`;
      params.push(nome);
    }

    if (ativo) {
      where += ` AND cc.ativo = ? `;
      params.push(ativo);
    }
    if (id_matriz) {
      where += ` AND gp.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (id_grupo_economico) {
      where += ` AND cc.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (termo) {
      where += ` AND cc.nome LIKE CONCAT('%',?,'%')`;
      params.push(termo);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rowQtdeTotal] = await conn.execute(
        `SELECT
          COUNT(cc.id) as qtde
          FROM fin_centros_custo as cc
          LEFT JOIN grupos_economicos gp ON gp.id = cc.id_grupo_economico
          ${where}`,
        params
      );

      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }

      const query = `
            SELECT
             cc.*, gp.nome as grupo_economico FROM fin_centros_custo as cc
            LEFT JOIN grupos_economicos gp ON gp.id = cc.id_grupo_economico
            ${where}
            GROUP BY cc.id
            ORDER BY cc.id DESC
            ${limit}
            `;

      const [rows] = await conn.execute(query, params);
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      await conn.commit();
      resolve(objResponse);
    } catch (error) {
      await conn.rollback();
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
      await conn.beginTransaction();
      const [rowPlanoContas] = await conn.execute(
        `
            SELECT cc.* FROM fin_centros_custo as cc
            LEFT JOIN 
            grupos_economicos gp ON gp.id = cc.id_grupo_economico 
            WHERE cc.id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];
      await conn.commit();
      resolve(planoContas);
      return;
    } catch (error) {
      await conn.rollback();
      reject(error);
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

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_CENTRO_CUSTO_INSERT", error);
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

      await conn.execute(updateQuery + " WHERE id = ?", params);
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_CENTRO_CUSTO_UPDATE", error);
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
