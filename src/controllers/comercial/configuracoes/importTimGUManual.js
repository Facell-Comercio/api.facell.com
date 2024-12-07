const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { importFromExcel } = require("../../../helpers/lerXML");
const { parse } = require("date-fns");
const { excelDateToJSDate } = require("../../../helpers/mask");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const user = req.user;
    conn = conn_externa || (await db.getConnection());

    const filePath = req.file?.path;
    if (!filePath) {
      throw new Error("É necessário informar um arquivo!");
    }

    const excelFileList = importFromExcel(filePath);
    const retorno = [];
    let totalUsuarios = excelFileList.length;
    const arrayUsuarios = [];
    const maxLength = 10000;

    for (const usuario of excelFileList) {
      const obj = { ...usuario };
      try {
        const [rowFiliais] = await conn.execute(
          `
          SELECT
            gp.id as id_grupo_economico, f.tim_custcode as custcode
          FROM filiais f
          LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
          WHERE f.nome LIKE CONCAT('%',?,'%')
        `,
          [String(usuario.filial).trim()]
        );

        const filial = rowFiliais && rowFiliais[0];
        if (!filial) {
          throw new Error(`Filial não encontrada no sistema`);
        }
        if (!usuario.nome) {
          throw new Error("Nome não informado!");
        }
        if (!usuario.matricula) {
          throw new Error("Matrícula não informada!");
        }
        if (!usuario.cpf) {
          throw new Error("CPF não informado!");
        }

        arrayUsuarios.push(`(
          ${db.escape(filial.id_grupo_economico)},
          ${db.escape(usuario.nome)},
          ${db.escape(usuario.cargo)},
          ${db.escape(usuario.matricula)},
          ${db.escape(usuario.cpf)},
          ${db.escape(filial.custcode)},
          ${db.escape(excelDateToJSDate(usuario.data_nascimento))},
          ${db.escape(excelDateToJSDate(usuario.data_admissao))}
          )
        `);

        if (arrayUsuarios.length === maxLength || totalUsuarios === 1) {
          const queryInsert = `
          INSERT IGNORE INTO tim_gestao_usuarios
          (
            id_grupo_economico,
            nome,
            cargo,
            matricula,
            cpf,
            custcode,
            data_nascimento,
            data_admissao
          )
            VAlUES
            ${arrayUsuarios.join(",")}
            ON DUPLICATE KEY UPDATE
              custcode = VALUES(custcode),
              cpf = VALUES(cpf),
              data_nascimento = VALUES(data_nascimento),
              data_admissao = VALUES(data_admissao),
              cargo = VALUES(cargo)
          `;
          await conn.execute(queryInsert);

          arrayUsuarios.length = 0;
        }
        obj["STATUS"] = "OK";
        obj["OBSERVAÇÃO"] = String("IMPORTADO COM SUCESSO").toUpperCase();
      } catch (erro) {
        obj["STATUS"] = "ERRO";
        obj["OBSERVAÇÃO"] = String(erro.message).toUpperCase();
        console.log(obj);
      } finally {
        retorno.push(obj);
        totalUsuarios--;
      }
    }
    if (excelFileList.length > 0) {
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
        [
          user.id,
          "IMPORT_TIM_GESTAO_USUARIOS_MANUAL",
          `Foram importados ${excelFileList.length} registros!`,
        ]
      );
    }

    res.status(200).json(retorno);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "COMISSIONAMENTO",
      method: "IMPORT_TIM_GU_MANUAL",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
