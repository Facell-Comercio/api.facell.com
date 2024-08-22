const { parse, startOfDay, formatDate, startOfMonth } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const {
  excelDateToJSDate,
  formatDatabaseDate,
  normalizeNumberOnly,
} = require("../../../helpers/mask");
const { checkCPF } = require("../../../helpers/chekers");

module.exports = function importMetas(req) {
  return new Promise(async (resolve, reject) => {
    const metas = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    let conn;
    try {
      if (!metas || metas.length === 0) {
        throw new Error("Nenhuma meta foi informada no arquivo");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      const retorno = [];
      for (const meta of metas) {
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
          controle,
          pos,
          upgrade,
          qtde_aparelho,
          receita,
          aparelho,
          acessorio,
          pitzi,
          fixo,
          wttx,
          live,
        } = meta;

        let obj = {
          ...meta,
          ref: formatDate(excelDateToJSDate(ref), "dd/MM/yyyy"),
          ciclo: formatDate(excelDateToJSDate(ciclo), "dd/MM/yyyy"),
          data_inicial: formatDate(
            excelDateToJSDate(data_inicial),
            "dd/MM/yyyy"
          ),
          data_final: formatDate(excelDateToJSDate(data_final), "dd/MM/yyyy"),
        };
        try {
          let cpf_padrao = cpf;
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
          if (cargo !== "FILIAL") {
            if (!checkCPF(cpf)) {
              throw new Error(`CPF inválido`);
            }
            cpf_padrao = normalizeNumberOnly(cpf);
          } else {
            const [filiais] = await conn.execute(
              `SELECT id FROM filiais f WHERE nome = ?`,
              [cpf]
            );
            if (!(filiais && filiais.length && filiais[0].id)) {
              throw new Error(`CPF inválido`);
            }
          }
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
              proporcional
            )
          ) {
            throw new Error("PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS!");
          }

          if (id) {
            await conn.execute(
              `UPDATE metas SET
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
                controle =  ?,
                pos =  ?,
                upgrade =  ?,
                receita =  ?,
                qtde_aparelho =  ?,
                aparelho =  ?,
                acessorio =  ?,
                pitzi =  ?,
                fixo =  ?,
                wttx =  ?,
                live =  ?,

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

                parseFloat(proporcional || '0'),
                parseInt(controle || '0'),
                parseInt(pos || '0'),
                parseInt(upgrade || '0'),
                parseFloat(receita || '0'),
                parseInt(qtde_aparelho || '0'),
                parseFloat(aparelho || '0'),
                parseFloat(acessorio || '0'),
                parseFloat(pitzi || '0'),
                parseInt(fixo || '0'),
                parseInt(wttx || '0'),
                parseInt(live || '0'),

                id_filial,

                id,
              ]
            );
          } else {
            const [result] = await conn.execute(
              `INSERT INTO metas (
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
                controle,
                pos,
                upgrade,
                receita,
                qtde_aparelho,
                aparelho,
                acessorio,
                pitzi,
                fixo,
                wttx,
                live,

                id_filial
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
                parseInt(controle),
                parseInt(pos),
                parseInt(upgrade),
                parseFloat(receita),
                parseInt(qtde_aparelho),
                parseFloat(aparelho),
                parseFloat(acessorio),
                parseFloat(pitzi),
                parseInt(fixo),
                parseInt(wttx),
                parseInt(live),

                id_filial,
              ]
            );
            const newId = result.insertId;
            if (!newId) {
              throw new Error(`Meta não inserida`);
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
        origin: "METAS",
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
