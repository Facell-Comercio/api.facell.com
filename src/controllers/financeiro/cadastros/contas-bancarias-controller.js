const { db } = require("../../../../mysql");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = checkUserPermission(req, "MASTER");

    const contas_bancarias_habilitadas = [];

    user?.filiais?.forEach((f) => {
      contas_bancarias_habilitadas.push(f.id);
    });

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters, pagination } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const {
      id_filial,
      id_tipo_conta,
      banco,
      id_grupo_economico,
      descricao,
      active,
      id_matriz,
    } = filters || {};
    var where = ` WHERE 1=1 `;
    const params = [];

    if (!isMaster) {
      if (
        !contas_bancarias_habilitadas ||
        contas_bancarias_habilitadas.length === 0
      ) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND f.id IN(${contas_bancarias_habilitadas.join(",")}) `;
    }

    if (id_filial) {
      where += ` AND f.id = ? `;
      params.push(id_filial);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (id_tipo_conta) {
      where += ` AND cb.id_tipo_conta = ? `;
      params.push(id_tipo_conta);
    }
    if (banco) {
      if (+banco) where += ` AND fb.codigo = ? `;
      else where += ` AND fb.nome LIKE CONCAT('%',?,'%') `;
      params.push(banco);
    }
    if (id_grupo_economico) {
      where += ` AND ge.id = ? `;
      params.push(id_grupo_economico);
    }
    if (descricao) {
      where += ` AND cb.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (active) {
      where += ` AND cb.active = ? `;
      params.push(active);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(cb.id) as qtde 
            FROM fin_contas_bancarias cb
            LEFT JOIN filiais f ON f.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN fin_tipos_contas ftc ON ftc.id = cb.id_tipo_conta
            LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT 
              f.id_matriz, cb.id, cb.descricao, f.nome as filial, ge.nome, 
              fb.nome as banco, ge.nome as grupo_economico, 
              ftc.tipo as tipo_conta, cb.active
            FROM fin_contas_bancarias cb
            LEFT JOIN filiais f ON f.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN fin_tipos_contas ftc ON ftc.id = cb.id_tipo_conta
            LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
            ${where}
            ORDER BY cb.id DESC
            LIMIT ? OFFSET ?
            `;

      const [rows] = await conn.execute(query, params);

      // console.log(query, contas_bancarias_habilitadas);
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
      const [rowPlanoContas] = await conn.execute(
        `
            SELECT cb.id, cb.id_filial, cb.id_tipo_conta, cb.id_banco, cb.agencia, cb.dv_agencia, cb.conta, cb.dv_conta, cb.descricao, f.nome as filial, f.id_matriz, ge.nome as grupo_economico, fb.nome as banco, ftc.tipo as tipo_conta, cb.active 
            FROM fin_contas_bancarias cb
            LEFT JOIN filiais f ON f.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN fin_tipos_contas ftc ON ftc.id = cb.id_tipo_conta 
            LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
            WHERE cb.id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];
      resolve(planoContas);
      return;
    } catch (error) {
      reject(error);
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
      await conn.beginTransaction();

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

      const query = `INSERT INTO fin_contas_bancarias (${campos}) VALUES (${values});`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_CONTAS_BANCARIAS_INSERT", error);
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
      await conn.beginTransaction();

      if (!id) {
        throw new Error("ID não informado!");
      }
      const params = [];
      let updateQuery = "UPDATE fin_contas_bancarias SET ";

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
      console.log("ERRO_CONTAS_BANCARIAS_UPDATE", error);
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
