const { parse, startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { excelDateToJSDate } = require("../../../helpers/mask");

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
        };
        try {
          const [rowFiliais] = await conn.execute(
            `
            SELECT id FROM filiais WHERE nome LIKE CONCAT('%',?,'%')
          `,
            [String(filial).trim()]
          );
          const id_filial = rowFiliais && rowFiliais[0] && rowFiliais[0].id;
          if (!id_filial) {
            throw new Error(`Filial não encontrada no sistema`);
          }
          if (parseFloat(valor) <= 0) {
            throw new Error(`Valor do meta não pode ser zero`);
          }
          if (cpf.length !== 11) {
            throw new Error(`CPF inválido`);
          }

          const [result] = await conn.execute(
            `INSERT INTO metas (
              data_inicio_cobranca,
              nome_colaborador,
              cpf_colaborador,
              id_filial,
              origem,
              parcelas,
              parcela,
              valor,
              saldo,
              obs,
              id_criador
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              startOfDay(excelDateToJSDate(data_inicio_cobranca)),
              colaborador.nome,
              cpf,
              id_filial,
              origem,
              1,
              1,
              valor,
              valor,
              obs,
              user.id,
            ]
          );
          const newId = result.insertId;

          if (!newId) {
            throw new Error(`Meta não inserido`);
          }
          obj = {
            id: newId,
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

      await conn.rollback();
      // await conn.commit();
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
