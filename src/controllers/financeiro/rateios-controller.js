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
    const { active, id_grupo_economico, nome, codigo } = filters || {};
    // const { id_filial, termo } = filters || {id_filial: 1, termo: null}
    console.log(filters);
    var where = ` WHERE 1=1 `;
    const params = [];

    if (nome) {
      where += ` AND fr.nome LIKE CONCAT(?,'%') `;
      params.push(nome);
    }
    if (codigo) {
      where += ` AND fr.codigo LIKE CONCAT(?,'%') `;
      params.push(codigo);
    }
    if (id_grupo_economico) {
      where += ` AND fr.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (active) {
      where += ` AND fr.active = ? `;
      params.push(active);
    }

    const offset = pageIndex * pageSize;

    console.log(params);
    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT 
            COUNT(fr.id) as qtde  
            FROM fin_rateio fr
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      console.log(params);
      var query = `
            SELECT fr.id, fr.id_grupo_economico, fr.nome, fr.codigo, fr.active, ge.label as grupo_economico FROM fin_rateio fr
            LEFT JOIN grupos_economicos ge ON fr.id_grupo_economico = ge.id
            ${where}
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
      const [rowRateios] = await db.execute(
        `
        SELECT 
        fr.id, 
        fr.id_grupo_economico, 
        fr.nome, 
        fr.codigo, 
        fr.active,
        fr.manual
    FROM fin_rateio fr
    WHERE fr.id = ?
            `,
        [id]
      );
      const rateios = rowRateios && rowRateios[0];
      const [rowRateioItens] = await db.execute(
        `
            SELECT 
              fri.id as id_item, 
              fri.id_filial, 
              FORMAT(fri.percentual * 100, 2) as percentual 
            FROM fin_rateio_itens fri
            LEFT JOIN fin_rateio fr ON fri.id_rateio = fr.id
            WHERE fr.id = ?
            `,
        [id]
      );
      resolve({ ...rateios, itens: rowRateioItens });
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

      const query = `INSERT INTO fin_rateio (${campos}) VALUES (${values});`;

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
    const { id, active, id_grupo_economico, nome, codigo, manual, itens } =
      req.body;
    console.log(req.body);
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("ID_GRUPO_ECONOMICO não informado!");
      }
      if (!nome) {
        throw new Error("NOME não informado!");
      }
      if (!codigo) {
        throw new Error("CODIGO não informado!");
      }
      if (!manual && !itens?.length) {
        throw new Error("ITENS não informados!");
      }
      if (manual === undefined) {
        throw new Error("MANUAL não informado!");
      }
      await conn.beginTransaction();

      // TODO Deletar os itens anteriores
      await conn.execute(`DELETE FROM fin_rateio_itens WHERE id_rateio =?`, [
        id,
      ]);
      // TODO Update do rateio
      await conn.execute(
        `UPDATE fin_rateio SET id_grupo_economico = ?, nome = ?, codigo = ?, manual =?, active = ? WHERE id =?`,
        [id_grupo_economico, nome, codigo, manual, active, id]
      );
      // TODO Inserir os itens
      if (!manual) {
        itens.forEach(async ({ id_filial, percentual }) => {
          await conn.execute(
            `INSERT INTO fin_rateio_itens (id_rateio, id_filial, percentual) VALUES(?,?,?)`,
            [id, id_filial, percentual]
          );
        });
      }

      console.log(itens);

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log(error);
      conn.rollback();
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
