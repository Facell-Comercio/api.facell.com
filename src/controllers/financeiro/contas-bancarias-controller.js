const { db } = require("../../../mysql");
const { param } = require("../../routes/financeiro/plano-contas");

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
      id_filial,
      id_tipo_conta,
      id_banco,
      agencia,
      conta,
      descricao,
      ativo,
    } = filters || {};
    // const { id_filial, termo } = filters || {id_filial: 1, termo: null}
    console.log(filters);
    var where = ` WHERE 1=1 `;
    const params = [];

    if (id_filial) {
      where += ` AND f.id = ? `;
      params.push(id_filial);
    }
    if (descricao) {
      where += ` AND cb.descricao LIKE CONCAT(?,'%') `;
      params.push(descricao);
    }
    if (ativo) {
      where += ` AND cb.active = ? `;
      params.push(ativo);
    }

    const offset = pageIndex * pageSize;

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT 
            COUNT(cb.id) as qtde 
            FROM fin_contas_bancarias cb
            LEFT JOIN filiais ff ON ff.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN fin_tipos_contas ftc ON ftc.id = cb.id_tipo_conta
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT cb.id, cb.id_filial, cb.id_tipo_conta, cb.id_banco, cb.agencia, cb.conta, cb.descricao, ff.nome as filial, fb.nome_banco as banco, ftc.tipo as tipo, cb.active FROM fin_contas_bancarias cb
            LEFT JOIN filiais ff ON ff.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN fin_tipos_contas ftc ON ftc.id = cb.id_tipo_conta
            ${where}
            ORDER BY cb.id DESC
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
            SELECT cb.id, cb.id_filial, cb.id_tipo_conta, cb.id_banco, cb.agencia, cb.conta, cb.descricao, ff.nome as filial, fb.nome_banco as banco, ftc.tipo as tipo, cb.active FROM fin_contas_bancarias cb
            LEFT JOIN filiais ff ON ff.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN fin_tipos_contas ftc ON ftc.id = cb.id_tipo_conta 
            WHERE cb.id = ?
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

      const query = `INSERT INTO fin_contas_bancarias (${campos}) VALUES (${values});`;

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
