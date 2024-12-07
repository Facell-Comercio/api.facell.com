const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { importFromExcel } = require("../../../helpers/lerXML");
const { parse, formatDate } = require("date-fns");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const user = req.user;
    conn = conn_externa || (await db.getConnection());

    const { mes, ano } = req.body;
    const filePath = req.file?.path;

    if (!mes) {
      throw new Error("Mês é obrigatório!");
    }
    if (!ano) {
      throw new Error("Ano é obrigatório!");
    }
    if (!filePath) {
      throw new Error("É necessário informar um arquivo!");
    }

    const excelFileList = importFromExcel(filePath);
    // const excelFileList = importFromExcel(filePath, { sheetName: "CV_DEPENDENTE" });

    const retorno = [];
    let totalPessoas = excelFileList.length;
    const arrayPessoas = [];
    const maxLength = 10000;

    for (const pessoa of excelFileList) {
      const obj = { ...pessoa };

      try {
        const [rowPessoa] = await conn.execute(
          `
          SELECT gu.cpf, f.id as id_filial FROM tim_gestao_usuarios gu
          LEFT JOIN filiais f ON f.tim_custcode = gu.custcode
          WHERE (gu.matricula = ? OR gu.nome LIKE ?)
          `,
          [String(pessoa["MATRICULA"]), String(pessoa["NOME"])]
        );
        const pessoaBanco = rowPessoa && rowPessoa[0];
        if (!pessoaBanco?.cpf) {
          throw new Error("CPF NÃO ENCONTRADO!");
        }
        if (!pessoaBanco?.id_filial) {
          throw new Error("FILIAL NÃO ENCONTRADA!");
        }
        obj["REF"] = formatDate(new Date(ano, mes - 1, 1), "dd/MM/yyyy");
        obj["CPF"] = pessoaBanco?.cpf;
        obj["ID_FILIAL"] = pessoaBanco?.id_filial;

        arrayPessoas.push(`(
          ${db.escape(new Date(ano, mes - 1, 1))},
          ${db.escape(pessoaBanco.id_filial)},
          ${db.escape(pessoaBanco.cpf)},
          ${db.escape(pessoa["TOTAL"])},
          ${db.escape(pessoa["TZ"])}
          )
        `);

        if (arrayPessoas.length === maxLength || totalPessoas === 1) {
          const queryInsert = `
            INSERT IGNORE INTO tim_trafego_zero_dep
            (
              ref,
              id_filial,
              cpf,
              total,
              tz
            )
            VAlUES
            ${arrayPessoas.join(",")}
            
          `;
          await conn.execute(queryInsert);

          arrayPessoas.length = 0;
        }
        obj["STATUS"] = "OK";
        obj["OBSERVAÇÃO"] = String("IMPORTADO COM SUCESSO").toUpperCase();
      } catch (erro) {
        obj["STATUS"] = "ERRO";
        obj["OBSERVAÇÃO"] = String(erro.message).toUpperCase();
      } finally {
        retorno.push(obj);
        totalPessoas--;
      }
    }
    if (excelFileList.length > 0) {
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
        [
          user.id,
          "IMPORT_TIM_TRAFEGO_ZERO_DEP",
          `Foram importados ${excelFileList.length} registros!`,
        ]
      );
    }

    res.status(200).json(retorno);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "COMISSIONAMENTO",
      method: "IMPORT_TIM_TRAFEGO_ZERO_DEP",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
