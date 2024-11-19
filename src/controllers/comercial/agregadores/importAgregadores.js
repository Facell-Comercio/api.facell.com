const { parse, startOfDay, formatDate, startOfMonth } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const {
  excelDateToJSDate,
  formatDatabaseDate,
  normalizeNumberOnly,
} = require("../../../helpers/mask");
const { checkCPF } = require("../../../helpers/chekers");

module.exports = function importAgregadores(req) {
  return new Promise(async (resolve, reject) => {
    const agregadores = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    let conn;
    try {
      if (!agregadores || agregadores.length === 0) {
        throw new Error("Nenhum agregador foi informado no arquivo");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      const retorno = [];
      for (const agregador of agregadores) {
        const {
          id,
          ref,
          ciclo,
          filial,
          cargo,
          cpf,
          nome,
          tags,
          data_inicial,
          data_final,
          proporcional,
          tipo_agregacao,
          metas_agregadas,
        } = agregador;

        let obj = {
          ...agregador,
          ref: formatDate(excelDateToJSDate(ref), "dd/MM/yyyy"),
          ciclo: formatDate(excelDateToJSDate(ciclo), "dd/MM/yyyy"),
          data_inicial: formatDate(
            excelDateToJSDate(data_inicial),
            "dd/MM/yyyy"
          ),
          data_final: formatDate(excelDateToJSDate(data_final), "dd/MM/yyyy"),
        };
        try {
          const [rowFiliais] = await conn.execute(
            `
            SELECT f.id as id_filial, gp.nome as grupo_economico
            FROM filiais f
            LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
            WHERE f.nome = ?
          `,
            [String(filial).trim()]
          );

          const { id_filial, grupo_economico } = rowFiliais && rowFiliais[0];

          if (!id_filial) {
            throw new Error(`Filial não encontrada no sistema`);
          }
          if (!checkCPF(cpf)) {
            throw new Error(`CPF inválido`);
          }

          let cpf_padrao = normalizeNumberOnly(cpf);

          if (
            !(
              ref &&
              ciclo &&
              filial &&
              cargo &&
              cpf &&
              nome &&
              data_inicial &&
              data_final &&
              proporcional &&
              tipo_agregacao
            )
          ) {
            throw new Error("Dados insuficientes");
          }
          if (id) {
            await conn.execute(
              `UPDATE facell_agregadores SET
                ref =  ?,
                ciclo =  ?,
                data_inicial =  ?,
                data_final =  ?,

                grupo_economico = ?,
                filial = ?,
                cpf =  ?,
                nome =  ?,
                cargo =  ?,
                tags =  ?,
                
                proporcional =  ?,
                metas_agregadas = ?,
                tipo_agregacao = ?,

                id_filial =  ?
              WHERE id = ?
              `,
              [
                startOfDay(excelDateToJSDate(ref)),
                startOfDay(excelDateToJSDate(ciclo)),
                startOfDay(excelDateToJSDate(data_inicial)),
                startOfDay(excelDateToJSDate(data_final)),

                grupo_economico,
                filial,
                cpf_padrao,
                nome,
                cargo,
                tags || null,

                parseFloat(proporcional),
                metas_agregadas || null,
                tipo_agregacao,

                id_filial,

                id,
              ]
            );
          } else {
            const [result] = await conn.execute(
              `INSERT INTO facell_agregadores (
                ref,
                ciclo,
                data_inicial,
                data_final,

                grupo_economico,
                filial,
                cpf,
                nome,
                cargo,
                tags,

                proporcional,
                metas_agregadas,
                tipo_agregacao,

                id_filial
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                startOfMonth(excelDateToJSDate(ref)),
                startOfMonth(excelDateToJSDate(ciclo)),
                startOfDay(excelDateToJSDate(data_inicial)),
                startOfDay(excelDateToJSDate(data_final)),

                grupo_economico,
                filial,
                cpf_padrao,
                nome,
                cargo,
                tags || null,

                parseFloat(proporcional),
                metas_agregadas || null,
                tipo_agregacao,

                id_filial,
              ]
            );
            const newId = result.insertId;
            if (!newId) {
              throw new Error(`Agregador não inserido`);
            }
            obj = {
              id: newId,
              ...obj,
            };
          }
          obj = {
            ...obj,
            status_importacao: "OK",
            observação: "IMPORTAÇÃO REALIZADA COM SUCESSO",
          };
        } catch (erro) {
          obj = {
            ...obj,
            status_importacao: "ERRO",
            observação: String(erro.message).toUpperCase(),
          };
        } finally {
          retorno.push(obj);
        }
      }

      // await conn.rollback();
      await conn.commit();
      resolve(retorno);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "AGREGADORES",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
