const { db } = require("../../../mysql");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { termo, id_grupo_economico } = filters || { termo: null };

    var where = ` WHERE 1=1 `;
    const params = [];
    const limit = pagination ? "LIMIT ? OFFSET ?" : "";

    if (termo) {
      where += ` AND f.termo = ?`;
      params.push(termo);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ?`;
      params.push(id_grupo_economico);
    }

    const offset = pageIndex * pageSize;

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT 
            COUNT(f.id) as qtde 
            FROM filiais f
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      var query = `
            SELECT f.*, g.nome as grupo_economico FROM filiais f
            JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where}
            
            ${limit}
            `;
      // console.log(query)
      // console.log(params)
      const [rows] = await db.execute(query, params);

      // console.log('Fetched users', users.length)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      console.log(objResponse);
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
      const [rowPlanoContas] = await db.execute(
        `
            SELECT *
            FROM users
            WHERE id = ?
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

function update(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

function remove(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

function add(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

function toggleActive(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

module.exports = {
  getAll,
  getOne,
  update,
  remove,
  add,
  toggleActive,
};
