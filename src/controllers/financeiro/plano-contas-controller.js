const { db } = require("../../../mysql");

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
    const {
      codigo,
      nivel,
      descricao,
      tipo,
      id_grupo_economico,
      descricao_pai,
      active,
      termo,
      id_filial,
    } = filters || {};
    // const { id_filial, termo } = filters || {id_filial: 1, termo: null}
    // console.log(filters);
    var where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND (pc.codigo LIKE CONCAT(?,'%') OR pc.descricao LIKE CONCAT('%',?,'%')) `;
      params.push(termo);
      params.push(termo);
    }
    if (id_filial) {
      where += ` AND f.id = ? `;
      params.push(id_filial);
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
    if (id_grupo_economico) {
      where += ` AND pc.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
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

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT 
            COUNT(pc.id) as qtde 
            FROM fin_plano_contas pc
            INNER JOIN filiais f ON f.id_grupo_economico = pc.id_grupo_economico
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT pc.*, gp.nome as grupo_economico FROM fin_plano_contas pc
            LEFT JOIN filiais f ON pc.id_grupo_economico = f.id_grupo_economico
            LEFT JOIN 
            grupos_economicos gp ON f.id_grupo_economico = gp.id
            ${where}
            ORDER BY pc.id DESC
            LIMIT ? OFFSET ?
            `;

      // console.log(query)
      // console.log(params)
      const [rows] = await db.execute(query, params);

      // console.log('Fetched Titulos', titulos.size)
      // console.log(objResponse)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
      // console.log(objResponse)
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
        //? No fornecedor-controller estava campos += "?" e não values += "?"
        values += `?`;
        params.push(
          typeof rest[key] == "string"
            ? rest[key].trim() || null
            : rest[key] ?? null
        ); // Adicionar valor do campo ao array de parâmetros
      });

      const query = `INSERT INTO fin_plano_contas (${campos}) VALUES (${values});`;

      await db.execute(query, params);
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_PLANO_CONTAS_INSERT", error);
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

      await db.execute(updateQuery + " WHERE id = ?", params);

      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_PLANO_CONTAS_UPDATE", error);
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
