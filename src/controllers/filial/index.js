const { db } = require("../../../mysql");
const { checkUserPermission } = require("../../helpers/checkUserPermission");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = checkUserPermission(req, "MASTER");

    const filiais_habilitadas = [];

    user?.filiais?.forEach((f) => {
      filiais_habilitadas.push(f.id);
    });

    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { termo, descricao, id_grupo_economico, id_matriz } = filters || {
      termo: null,
    };

    var where = ` WHERE 1=1 `;
    const params = [];
    const limit = pagination ? "LIMIT ? OFFSET ?" : "";

    if (!isMaster) {
      where += `AND f.id IN(${filiais_habilitadas.join(",")}) `;
    }

    if (termo) {
      const termoSoNumeros = termo.replace(/[^\d]/g, "");
      if (termoSoNumeros) {
        where += ` AND (
          f.nome LIKE CONCAT('%', ?, '%')
          OR f.cnpj LIKE CONCAT('%',?,'%')
        ) 
        `;
        params.push(termo);
        params.push(termoSoNumeros);
      } else {
        where += ` AND f.nome LIKE CONCAT('%', ?, '%')`;
        params.push(termo);
      }
    }

    if (descricao) {
      where += ` AND f.nome LIKE CONCAT('%', ?, '%')`;
      params.push(descricao);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ?`;
      params.push(id_grupo_economico);
    }
    if (id_matriz && id_matriz !== "all") {
      where += ` AND f.id_matriz = ?`;
      params.push(id_matriz);
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
            ORDER BY f.id DESC
            ${limit}
            `;
      const [rows] = await db.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
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
      const [rowItem] = await db.execute(
        `
            SELECT *
            FROM filiais
            WHERE id = ?
            `,
        [id]
      );
      const item = rowItem && rowItem[0];
      resolve(item);
      return;
    } catch (error) {
      reject(error);
      return;
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      nome,
      active,
      cnpj,
      cnpj_datasys,
      cod_datasys,
      apelido,
      id_matriz,
      id_grupo_economico,
      nome_fantasia,
      razao,
      telefone,
      email,
      logradouro,
      numero,
      complemento,
      cep,
      municipio,
      uf,
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID do usuário não enviado!");
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      await conn.beginTransaction();

      const set = [];
      const params = [];
      if (nome !== undefined) {
        set.push("nome = ?");
        params.push(nome);
      }
      if (cnpj !== undefined) {
        set.push("cnpj = ?");
        params.push(cnpj);
      }
      if (cnpj_datasys !== undefined) {
        set.push("cnpj_datasys = ?");
        params.push(cnpj_datasys);
      }
      if (cod_datasys !== undefined) {
        set.push("cod_datasys = ?");
        params.push(cod_datasys);
      }
      if (apelido !== undefined) {
        set.push("apelido = ?");
        params.push(apelido);
      }
      if (active !== undefined) {
        set.push("active = ?");
        params.push(active);
      }
      if (nome_fantasia !== undefined) {
        set.push("nome_fantasia = ?");
        params.push(nome_fantasia);
      }
      if (razao !== undefined) {
        set.push("razao = ?");
        params.push(razao);
      }
      if (id_matriz !== undefined) {
        set.push("id_matriz = ?");
        params.push(id_matriz);
      }
      if (id_grupo_economico !== undefined) {
        set.push("id_grupo_economico = ?");
        params.push(id_grupo_economico);
      }
      if (telefone !== undefined) {
        set.push("telefone = ?");
        params.push(telefone);
      }
      if (email !== undefined) {
        set.push("email = ?");
        params.push(email);
      }
      if (logradouro !== undefined) {
        set.push("logradouro = ?");
        params.push(logradouro);
      }
      if (numero !== undefined) {
        set.push("numero = ?");
        params.push(numero);
      }
      if (complemento !== undefined) {
        set.push("complemento = ?");
        params.push(complemento);
      }
      if (cep !== undefined) {
        set.push("cep = ?");
        params.push(cep);
      }
      if (municipio !== undefined) {
        set.push("municipio = ?");
        params.push(municipio);
      }
      if (uf !== undefined) {
        set.push("uf = ?");
        params.push(uf);
      }

      params.push(id);
      // Atualização de dados do usuário
      await conn.execute(
        `UPDATE filiais SET ${set.join(",")} WHERE id = ?`,
        params
      );

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_FILIAL_UPDATE", error);
      await conn.rollback();
      reject(error);
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      nome,
      cnpj,
      cnpj_datasys,
      cod_datasys,
      apelido,
      id_matriz,
      id_grupo_economico,
      nome_fantasia,
      razao,
      telefone,
      email,
      logradouro,
      numero,
      complemento,
      cep,
      municipio,
      uf,
    } = req.body;

    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }

      const campos = [];
      const values = [];
      const params = [];

      if (nome !== undefined) {
        campos.push("nome");
        values.push("?");
        params.push(nome);
      }
      if (cnpj !== undefined) {
        campos.push("cnpj");
        values.push("?");
        params.push(cnpj);
      }
      if (cnpj_datasys !== undefined) {
        campos.push("cnpj_datasys");
        values.push("?");
        params.push(cnpj_datasys);
      }
      if (cod_datasys !== undefined) {
        campos.push("cod_datasys");
        values.push("?");
        params.push(cod_datasys);
      }
      if (apelido !== undefined) {
        campos.push("apelido");
        values.push("?");
        params.push(apelido);
      }
      if (id_matriz !== undefined) {
        campos.push("id_matriz");
        values.push("?");
        params.push(id_matriz);
      }
      if (id_grupo_economico !== undefined) {
        campos.push("id_grupo_economico");
        values.push("?");
        params.push(id_grupo_economico);
      }
      if (nome_fantasia !== undefined) {
        campos.push("nome_fantasia");
        values.push("?");
        params.push(nome_fantasia);
      }
      if (razao !== undefined) {
        campos.push("razao");
        values.push("?");
        params.push(razao);
      }
      if (telefone !== undefined) {
        campos.push("telefone");
        values.push("?");
        params.push(telefone);
      }
      if (email !== undefined) {
        campos.push("email");
        values.push("?");
        params.push(email);
      }
      if (logradouro !== undefined) {
        campos.push("logradouro");
        values.push("?");
        params.push(logradouro);
      }
      if (numero !== undefined) {
        campos.push("numero");
        values.push("?");
        params.push(numero);
      }
      if (complemento !== undefined) {
        campos.push("complemento");
        values.push("?");
        params.push(complemento);
      }
      if (cep !== undefined) {
        campos.push("cep");
        values.push("?");
        params.push(cep);
      }
      if (municipio !== undefined) {
        campos.push("municipio");
        values.push("?");
        params.push(municipio);
      }
      if (uf !== undefined) {
        campos.push("uf");
        values.push("?");
        params.push(uf);
      }

      const query = `INSERT INTO filiais (${campos.join(
        ","
      )}) VALUES (${values.join(",")});`;

      await db.execute(query, params);
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.log("ERRO_FILIAL_INSERT", error);
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  update,
  insertOne,
};
