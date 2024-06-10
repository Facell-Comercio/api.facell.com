const { db } = require("../../../../mysql");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = checkUserPermission(req, "MASTER");

    const planos_contas_habilitados = [];

    user?.filiais?.forEach((f) => {
      planos_contas_habilitados.push(f.id);
    });

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    if (!isMaster) {
      if (
        !planos_contas_habilitados ||
        planos_contas_habilitados.length === 0
      ) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND f.id IN(${planos_contas_habilitados.join(",")}) `;
    }

    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const {
      codigo,
      nivel,
      descricao,
      tipo,
      id_grupo_economico,
      descricao_pai,
      active,
      termo,
      id_matriz,
    } = filters || {};
    var where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND (pc.codigo LIKE CONCAT(?,'%') OR pc.descricao LIKE CONCAT('%',?,'%')) `;
      params.push(termo);
      params.push(termo);
    }
    if (id_matriz) {
      where += ` AND f.id = ? `;
      params.push(id_matriz);
    }
    if (id_grupo_economico) {
      where += ` AND pc.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (codigo) {
      where += ` AND pc.codigo LIKE CONCAT(?,'%') `;
      params.push(codigo);
    }
    if (descricao) {
      where += ` AND pc.descricao LIKE CONCAT(?,'%') `;
      params.push(descricao);
    }
    if (tipo) {
      where += ` AND pc.tipo = ? `;
      params.push(tipo);
    }
    if (descricao_pai) {
      where += ` AND pc.descricao_pai LIKE CONCAT(?,'%') `;
      params.push(descricao_pai);
    }
    if (active) {
      where += ` AND pc.active = ? `;
      params.push(active);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
            SELECT DISTINCT pc.id
            FROM fin_plano_contas pc
            INNER JOIN filiais f ON f.id_grupo_economico = pc.id_grupo_economico
            INNER JOIN grupos_economicos gp ON f.id_grupo_economico = gp.id
            ${where}
        ) AS subconsulta
        `,
        params
      );

      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      params.push(pageSize);
      params.push(offset);

      let query = `
      SELECT DISTINCT
      pc.*, gp.nome as grupo_economico FROM fin_plano_contas pc
      LEFT JOIN filiais f ON pc.id_grupo_economico = f.id_grupo_economico
      LEFT JOIN grupos_economicos gp ON f.id_grupo_economico = gp.id
      ${where}
      ORDER BY pc.id DESC
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
      console.error("ERRO_GET_ALL_PLANO_CONTAS", error);
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
      const [rowPlanoContas] = await conn.execute(
        `
            SELECT pc.*, gp.nome as grupo_economico FROM fin_plano_contas pc
            INNER JOIN filiais f ON f.id_grupo_economico = pc.id_grupo_economico
            LEFT JOIN 
            grupos_economicos gp ON gp.id = pc.id_grupo_economico 
            WHERE pc.id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];
      resolve(planoContas);
      return;
    } catch (error) {
      console.error("ERRO_GET_ONE_PLANO_CONTAS", error);
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
      let params = [];

      Object.keys(rest).forEach((key, index) => {
        if (index > 0) {
          campos += ", "; // Adicionar vírgula entre os campos
          values += ", "; // Adicionar vírgula entre os values
        }
        campos += `${key}`;
        //? No fornecedor-controller estava campos += "?" e não values += "?"
        values += `?`;
        params.push(
          typeof rest[key] == "string"
            ? rest[key].trim() || null
            : rest[key] ?? null
        ); // Adicionar valor do campo ao array de parâmetros
      });

      const query = `INSERT INTO fin_plano_contas (${campos}) VALUES (${values});`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.error("ERRO_PLANO_CONTAS_INSERT", error);
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
      let updateQuery = "UPDATE fin_plano_contas SET ";

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
      console.error("ERRO_PLANO_CONTAS_UPDATE", error);
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
};
