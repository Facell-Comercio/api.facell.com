const { db } = require("../../../mysql");
const { v4: uuidv4 } = require("uuid");
const {
  urlContemTemp,
  moverArquivoTempParaUploads,
} = require("../files-controller");
const { logger } = require("../../../logger");

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
    const { pageIndex, pageSize } = pagination || { pageIndex: 0, pageSize: 5 };
    const { termo } = filters || { termo: null };

    var where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND u.nome LIKE CONCAT('%', ?, '%')`;
      params.push(termo);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(u.id) as qtde 
            FROM users u
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT u.*, '*****' as senha FROM users u
            ${where}
            
            LIMIT ? OFFSET ?
            `;

      // console.log(query)
      // console.log(params)
      const [rows] = await conn.execute(query, params);

      // console.log('Fetched users', users.length)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: 'ADM', origin: 'USERS', method: 'GET_ALL',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
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
      const [rowUser] = await conn.execute(
        `
            SELECT u.*, '***' as senha, '***' as senha_temporaria
            FROM users u
            WHERE u.id = ?
            `,
        [id]
      );

      const user = rowUser && rowUser[0];

      const [permissoes] = await conn.execute(
        `
            SELECT up.*, p.nome
            FROM users_permissoes up
            INNER JOIN permissoes p ON p.id = up.id_permissao
            WHERE up.id_user = ?
            `,
        [id]
      );

      const [departamentos] = await conn.execute(
        `
            SELECT ud.*, d.nome
            FROM users_departamentos ud
            INNER JOIN departamentos d ON d.id = ud.id_departamento
            WHERE ud.id_user = ?
            `,
        [id]
      );

      const [filiais] = await conn.execute(
        `
            SELECT uf.*, f.nome, g.nome as grupo_economico
            FROM users_filiais uf
            INNER JOIN filiais f ON f.id = uf.id_filial
            INNER JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            WHERE uf.id_user = ?
            ORDER BY g.id, f.id
            `,
        [id]
      );

      const [centros_custo] = await conn.execute(
        `
            SELECT ucc.*, fcc.nome, g.nome as grupo_economico
            FROM users_centros_custo ucc
            INNER JOIN fin_centros_custo fcc ON fcc.id = ucc.id_centro_custo
            INNER JOIN grupos_economicos g ON g.id = fcc.id_grupo_economico
            WHERE ucc.id_user = ?
            ORDER BY g.id, fcc.id
            `,
        [id]
      );

      const objUser = {
        ...user,
        permissoes,
        departamentos,
        filiais,
        centros_custo,
      };
      // console.log(objUser)
      resolve(objUser);
      return;
    } catch (error) {
      logger.error({
        module: 'ADM', origin: 'USERS', method: 'GET_ONE',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      nome,
      email,
      active,
      img_url,
      filiais,
      updateFiliais,
      departamentos,
      updateDepartamentos,
      centros_custo,
      updateCentrosCusto,
      permissoes,
      updatePermissoes,
    } = req.body;
    // console.log(req.body)

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID do usuário não enviado!");
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      if (!email) {
        throw new Error("Email não enviado!");
      }
      await conn.beginTransaction();

      // Verificar se a imagem é temporária
      const isImgTemp = urlContemTemp(img_url);

      var newImgUrl = img_url;
      if (isImgTemp) {
        // Persistir imagem
        const urlImgPersistida = await moverArquivoTempParaUploads(img_url);
        newImgUrl = urlImgPersistida;
      }

      // Atualização de dados do usuário
      await conn.execute(
        "UPDATE users SET nome = ?, email = ?, img_url = ?, active = ? WHERE id = ?",
        [nome, email, newImgUrl, active, id]
      );

      // Atualização de arrays
      if (updateFiliais) {
        await conn.execute(`DELETE FROM users_filiais WHERE id_user = ?`, [id]);
        for (const uf of filiais) {
          await conn.execute(
            `INSERT INTO users_filiais (id_user, id_filial, gestor) VALUES (?,?,?)`,
            [id, uf.id_filial, uf.gestor]
          );
        }
      }
      if (updateDepartamentos) {
        await conn.execute(
          `DELETE FROM users_departamentos WHERE id_user = ?`,
          [id]
        );
        for (const udp of departamentos) {
          await conn.execute(
            `INSERT INTO users_departamentos (id_user, id_departamento, gestor) VALUES (?,?,?)`,
            [id, udp.id_departamento, udp.gestor]
          );
        }
      }
      if (updateCentrosCusto) {
        await conn.execute(
          `DELETE FROM users_centros_custo WHERE id_user = ?`,
          [id]
        );
        for (const ucc of centros_custo) {
          await conn.execute(
            `INSERT INTO users_centros_custo (id_user, id_centro_custo, gestor) VALUES (?,?,?)`,
            [id, ucc.id_centro_custo, ucc.gestor]
          );
        }
      }
      if (updatePermissoes) {
        await conn.execute(`DELETE FROM users_permissoes WHERE id_user = ?`, [
          id,
        ]);
        for (const user_permissao of permissoes) {
          await conn.execute(
            `INSERT INTO users_permissoes (id_user, id_permissao) VALUES (?,?)`,
            [id, user_permissao.id_permissao]
          );
        }
      }

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      await conn.rollback();
      logger.error({
        module: 'ADM', origin: 'USERS', method: 'UPDATE',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      nome,
      email,
      active,
      img_url,
      filiais,
      updateFiliais,
      departamentos,
      updateDepartamentos,
      centros_custo,
      updateCentrosCusto,
      permissoes,
      updatePermissoes,
    } = req.body;
    // console.log(req.body)

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "ID do usuário enviado, por favor, atualize ao invés de tentar inserir!"
        );
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      if (!email) {
        throw new Error("Email não enviado!");
      }
      await conn.beginTransaction();

      const newId = uuidv4();
      // Atualização de dados do usuário
      await conn.execute(
        "INSERT INTO users (id, nome, email, active) VALUES (?,?,?,?)",
        [newId, nome, email, active]
      );

      // Já que deu certo inserir o usuário, vamos importar a imagem dele...
      // Verificar se a imagem é temporária
      const isImgTemp = urlContemTemp(img_url);
      var newImgUrl = img_url;
      if (isImgTemp) {
        // Persistir imagem
        const urlImgPersistida = await moverArquivoTempParaUploads(img_url);
        newImgUrl = urlImgPersistida;
      }
      await conn.execute("UPDATE users SET img_url = ? WHERE id = ?", [
        newImgUrl,
        newId,
      ]);

      // Atualização de arrays
      if (updateFiliais) {
        for (const uf of filiais) {
          await conn.execute(
            `INSERT INTO users_filiais (id_user, id_filial, gestor) VALUES (?,?,?)`,
            [newId, uf.id_filial, uf.gestor]
          );
        }
      }
      if (updateDepartamentos) {
        for (const udp of departamentos) {
          await conn.execute(
            `INSERT INTO users_departamentos (id_user, id_departamento, gestor) VALUES (?,?,?)`,
            [newId, udp.id_departamento, udp.gestor]
          );
        }
      }
      if (updateCentrosCusto) {
        for (const ucc of centros_custo) {
          await conn.execute(
            `INSERT INTO users_centros_custo (id_user, id_centro_custo, gestor) VALUES (?,?,?)`,
            [newId, ucc.id_centro_custo, ucc.gestor]
          );
        }
      }
      if (updatePermissoes) {
        for (const user_permissao of permissoes) {
          await conn.execute(
            `INSERT INTO users_permissoes (id_user, id_permissao) VALUES (?,?)`,
            [newId, user_permissao.id_permissao]
          );
        }
      }

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      await conn.rollback();
      logger.error({
        module: 'ADM', origin: 'USERS', method: 'INSERT_ONE',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  update,
  insertOne,
};
