const { parse, startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { excelDateToJSDate } = require("../../../helpers/mask");

module.exports = function lancamentoLote(req) {
  return new Promise(async (resolve, reject) => {
    const vales = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    let conn;
    try {
      if (!vales || vales.length === 0) {
        throw new Error("Nenhum vale foi informado no arquivo");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      const retorno = [];
      for (const vale of vales) {
        const { data_inicio_cobranca, cpf, filial, origem, obs, valor, nome } =
          vale;
        let obj = {
          ...vale,
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
            throw new Error(`Valor do vale não pode ser zero`);
          }
          if (cpf.length !== 11) {
            throw new Error(`CPF inválido`);
          }

          const [result] = await conn.execute(
            `INSERT INTO vales (
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
            throw new Error(`Vale não inserido`);
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

      // await conn.rollback();
      await conn.commit();
      resolve(retorno);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
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
