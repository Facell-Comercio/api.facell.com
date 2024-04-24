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
      banco,
      fornecedor,
      id_titulo,
      num_doc,
      tipo_data,
      range_data,
      id_matriz,
      termo,
    } = filters || {};
    // const { id_matriz, termo } = filters || {id_matriz: 1, termo: null}
    // console.log(filters);
    let where = ` WHERE 1=1 `;
    const params = [];

    if (id_conta_bancaria) {
      where += ` AND b.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }
    if (banco) {
      where += ` AND fb.nome LIKE CONCAT('%', ?, '%')`;
      params.push(banco);
    }
    if (fornecedor) {
      where += ` AND ff.nome LIKE CONCAT('%', ?, '%') `;
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
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (termo) {
      where += ` AND (
                  b.id LIKE CONCAT(?,"%") OR
                  cb.descricao LIKE CONCAT("%",?,"%") OR
                  b.data_pagamento LIKE CONCAT("%",?,"%")
                ) `;
      //? Realizar a normalização de data_pagamento?
      params.push(termo);
      params.push(termo);
      params.push(termo);
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
            b.id
          FROM fin_cp_bordero b
          LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
          LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
          LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
          LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
          LEFT JOIN fin_bancos fb ON b.id = cb.id_banco
          LEFT JOIN filiais f ON f.id = t.id_filial
          ${where}
          GROUP BY b.id

        ) AS subconsulta
        `,
        params
      );

      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      params.push(pageSize);
      params.push(offset);

      const query = `
        SELECT
          b.id, b.data_pagamento, cb.descricao as conta_bancaria, t.descricao, f.id_matriz
        FROM fin_cp_bordero b
        LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
        LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
        LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
        LEFT JOIN filiais f ON f.id = t.id_filial

        ${where}
        GROUP BY b.id
        ORDER BY b.id DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await db.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      console.log(params);
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
              b.id, b.data_pagamento, b.id_conta_bancaria, 
              cb.descricao as conta_bancaria, f.id_matriz, fb.nome as banco
            FROM fin_cp_bordero b
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
            LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            WHERE b.id = ?
            `,
        [id]
      );
      const [rowTitulos] = await db.execute(
        `
            SELECT 
              tb.id_titulo, t.id_status, 
              f.nome as nome_fornecedor, cs.status, 
              b.data_pagamento, t.valor as valor_total, t.num_doc,
              t.descricao, b.id_conta_bancaria, fi.apelido as filial, 
              t.data_prevista as previsao, t.data_pagamento, false AS checked 
            FROM fin_cp_bordero b
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
            LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            LEFT JOIN filiais fi ON fi.id = t.id_filial
            LEFT JOIN fin_cp_status cs ON cs.id = t.id_status
            WHERE b.id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];

      const objResponse = {
        ...planoContas,
        titulos: rowTitulos,
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
    const { id, id_conta_bancaria, data_pagamento, titulos } = req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES (?, ?);`,
        [new Date(data_pagamento), id_conta_bancaria]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      // Inserir os titulos no borderô
      titulos.forEach(async ({ id_titulo }) => {
        await conn.execute(
          `INSERT INTO fin_cp_titulos_borderos (id_titulo, id_bordero) VALUES(?,?)`,
          [id_titulo, newId]
        );
      });

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_BORDERO_INSERT", error);
      reject(error);
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, id_conta_bancaria, data_pagamento, titulos } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_conta_bancaria) {
        throw new Error("ID_CONTA_BANCARIA não informado!");
      }
      if (!data_pagamento) {
        throw new Error("DATA_PAGAMENTO não informado!");
      }

      await conn.beginTransaction();

      // Update do bordero
      await conn.execute(
        `UPDATE fin_cp_bordero SET data_pagamento = ?, id_conta_bancaria = ? WHERE id =?`,
        [data_pagamento, id_conta_bancaria, id]
      );

      // Inserir os itens do bordero
      if (titulos.length > 0) {
        titulos.forEach(async ({ id_titulo }) => {
          await conn.execute(
            `INSERT INTO fin_cp_titulos_borderos (id_titulo, id_bordero) VALUES(?,?)`,
            [id_titulo, id]
          );
        });
      }

      await conn.commit();
      console.log("INSERIDO COM SUCESSO");
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_BORDEROS_UPDATE", error);
      reject(error);
    }
  });
}

function deleteTitulo(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    console.log(req.params);

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();

      const [rowTitulo] = await conn.execute(
        `SELECT id_status FROM fin_cp_titulos WHERE id = ?`,
        [id]
      );

      if (rowTitulo[0].id_status === 4) {
        throw new Error(
          "Não é possível remover do borderô titulos com status pago!"
        );
      }

      await conn.execute(
        `DELETE FROM fin_cp_titulos_borderos WHERE id_titulo = ? LIMIT 1`,
        [id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO NO DELETE_BORDERO", error);
      reject(error);
    }
  });
}

function deleteBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const titulos = req.body;

    console.log(id);

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.beginTransaction();

      for (const titulo of titulos) {
        if (titulo.id_status === 4) {
          throw new Error(
            "Não é possível remover do borderô titulos com status pago!"
          );
        }
      }

      await conn.execute(`DELETE FROM fin_cp_bordero WHERE id = ? LIMIT 1`, [
        id,
      ]);

      console.log("Pode excluir");

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO NO DELETE_BORDERO", error);
      reject(error);
    }
  });
}

function transferBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { new_id, titulos } = req.body;

    try {
      if (!new_id) {
        throw new Error("ID novo não informado!");
      }
      if (titulos.length < 0) {
        throw new Error("TITULOS não informado!");
      }

      titulos.forEach(async (id_titulo) => {
        await db.execute(
          `UPDATE fin_cp_titulos_borderos SET id_bordero = ? WHERE id_titulo = ?  LIMIT 1`,
          [new_id, id_titulo]
        );
      });

      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO NO TRANSFER_BORDERO", error);
      reject(error);
    }
  });
}

async function exportBorderos(req) {
  return new Promise(async (resolve, reject) => {
    const { data: borderos } = req.body;
    const titulosBordero = [];
    try {
      if (!borderos.length) {
        throw new Error("Quantidade inválida de de borderos!");
      }

      for (const b_id of borderos) {
        const response = await getOne({ params: { id: b_id } });
        response.titulos.forEach((titulo) => {
          const normalizeDate = (data) => {
            const date = new Date(data);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const formattedDay = String(day).padStart(2, "0");
            const formattedMonth = String(month).padStart(2, "0");
            return `${formattedDay}/${formattedMonth}/${year}`;
          };

          titulosBordero.push({
            BANCO: response.banco,
            "CONTA BANCÁRIA": response.conta_bancaria,
            "DATA PAGAMENTO": normalizeDate(response.data_pagamento),
            "ID TÍTULO": titulo.id_titulo,
            VENCIMENTO: normalizeDate(titulo.vencimento),
            VALOR: parseFloat(titulo.valor_total.toString()),
            DOC: titulo.num_doc || "",
            FORNECEDOR: titulo.nome_fornecedor,
            DESCRIÇÃO: titulo.descricao,
            STATUS: titulo.status,
          });
        });
      }

      resolve(titulosBordero);
    } catch (error) {
      console.log("ERRO NO TRANSFER_BORDERO", error);
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  deleteTitulo,
  deleteBordero,
  transferBordero,
  exportBorderos,
};
