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
    const { estabelecimento, num_maquina, id_filial, active } = filters || {};

    console.log(filters);
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

    // console.log(pageSize, offset);
    // console.log(params);
    try {
      const [rowTotal] = await db.execute(
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
      // console.log(query)
      // console.log(params);
      const [rows] = await db.execute(query, params);

      // console.log('Fetched Titulos', titulos.length)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      // console.log(objResponse)

      resolve(objResponse);
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
      const [rowFornecedor] = await db.execute(
        `
            SELECT *
            FROM fin_equipamentos_cielo fe
            WHERE id = ?
            `,
        [id]
      );
      const fornecedor = rowFornecedor && rowFornecedor[0];
      // console.log(fornecedor);
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

      const query = `INSERT INTO fin_equipamentos_cielo (${campos}) VALUES (${values});`;
      console.log(query);

      await db.execute(query, params);
      resolve({ message: "Sucesso" });
    } catch (error) {
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

      await db.execute(
        updateQuery +
          ` WHERE id = ?
        `,
        params
      );

      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      reject(error);
      return;
    }
  });
}

function consultaCnpj(req) {
  return new Promise(async (resolve, reject) => {
    const { cnpj } = req.params;

    fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`)
      .then((res) => res.json())
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
        console.log(error);
      });
  });
}

function toggleActive(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.query;
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await db.execute(
        `UPDATE fin_equipamentos_cielo SET active = NOT active WHERE id = ?`,
        [id]
      );
      resolve({ message: "Sucesso!" });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  consultaCnpj,
  toggleActive,
};
