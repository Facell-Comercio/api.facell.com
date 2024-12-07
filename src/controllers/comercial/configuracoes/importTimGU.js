const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { importFromExcel } = require("../../../helpers/lerXML");
const { parse } = require("date-fns");

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

    const excelFileList = importFromExcel(filePath, { options: { range: 1 } }).filter(
      (usuario) =>
        usuario["GRUPO ECONOMICO PDV"] == "FACELL LTDA" ||
        usuario["GRUPO ECONOMICO PDV"] == "FORT TELECOM"
    );
    let totalUsuarios = excelFileList.length;
    const arrayUsuarios = [];
    const maxLength = 10000;

    for (const usuario of excelFileList) {
      arrayUsuarios.push(`(
        ${db.escape(usuario["GRUPO ECONOMICO PDV"] == "FACELL LTDA" ? 1 : 9)},
        ${db.escape(usuario["NOME FUNCIONARIO"])},
        ${db.escape(usuario["CARGO"])},
        ${db.escape(usuario["MATRICULA"])},
        ${db.escape(usuario["CPF"])},
        ${db.escape(usuario["CUSTCODE PDV"])},
        ${db.escape(parse(usuario["DATA NASCIMENTO"], "dd/MM/yyyy", new Date()))},
        ${db.escape(parse(usuario["DATA ADMISSAO UO/PDV"], "dd/MM/yyyy", new Date()))}
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

      totalUsuarios--;
    }
    if (excelFileList.length > 0) {
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
        [
          user.id,
          "IMPORT_TIM_GESTAO_USUARIOS",
          `Foram importados ${excelFileList.length} registros!`,
        ]
      );
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "COMISSIONAMENTO",
      method: "IMPORT_TIM_GU",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
