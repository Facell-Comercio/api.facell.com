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
    const {
      id_conta_bancaria,
      fornecedor,
      id_titulo,
      num_doc,
      tipo_data,
      range_data,
    } = filters || {};
    // const { id_matriz, termo } = filters || {id_matriz: 1, termo: null}
    // console.log(filters);
    let where = ` WHERE 1=1 `;
    const params = [];

    if (id_conta_bancaria) {
      where += ` AND b.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }
    if (fornecedor) {
      where += ` AND f.nome LIKE CONCAT('%', ?, '%') `;
      params.push(fornecedor);
    }
    if (id_titulo) {
      where += ` AND tb.id_titulo = ? `;
      params.push(id_titulo);
    }
    if (num_doc) {
      where += ` AND t.num_doc = ? `;
      params.push(num_doc);
    }
    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND t.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND t.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND t.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }

    const offset = pageIndex * pageSize;

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT DISTINCT
            b.id, b.data_pagamento, cb.descricao as conta_bancaria
          FROM fin_cp_bordero b
          LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
          LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
          LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
          LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        ${where}
        ) AS subconsulta
        `,
        params
      );

      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      params.push(pageSize);
      params.push(offset);

      const query = `
        SELECT DISTINCT
          b.id, b.data_pagamento, cb.descricao as conta_bancaria
        FROM fin_cp_bordero b
        LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
        LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
        LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        ${where}
        ORDER BY b.id DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await db.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      console.log(objResponse);
      resolve(objResponse);
    } catch (error) {
      console.log("ERRO GET_ALL BORDERO", error);
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
            SELECT 
              b.id, b.data_pagamento, b.id_conta_bancaria, cb.descricao as conta_bancaria 
            FROM fin_cp_bordero b
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
            LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            WHERE b.id = ?
            `,
        [id]
      );
      const [rowTitulos] = await db.execute(
        `
            SELECT 
              tb.id_titulo, t.data_vencimento as vencimento, f.nome as nome_fornecedor,
              b.data_pagamento, t.valor as valor_total, t.num_doc,
              t.descricao, b.id_conta_bancaria, fi.apelido, t.data_pagamento 
            FROM fin_cp_bordero b
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
            LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            LEFT JOIN filiais fi ON fi.id = t.id_filial
            WHERE b.id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];

      const objResponse = {
        ...planoContas,
        rowTitulos,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      console.log("ERRO GET_ONE BORDERO", error);
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
