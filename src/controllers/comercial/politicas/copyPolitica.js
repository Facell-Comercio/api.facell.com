const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const getOne = require("./getOne");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { descricao, month, year, current_id } =
      req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!descricao) {
        throw new Error(
          "Descrição não informada!"
        );
      }
      if (!month) {
        throw new Error(
          "Mês de referência não informado!"
        );
      }
      if (!year) {
        throw new Error(
          "Ano de referência não informado!"
        );
      }
      const dataAtual = new Date();
      if (
        new Date(year, month - 1, 1) <
        new Date(
          dataAtual.getFullYear(),
          dataAtual.getMonth(),
          1
        )
      ) {
        throw new Error(
          "Período de referência inferior ao atual!"
        );
      }
      if (!current_id) {
        throw new Error(
          "ID da política atual não informado!"
        );
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      //* Coleta todos os dados da política atual
      const currentPolitica = await getOne({
        query: {
          id: current_id,
        },
      });

      //* Insere uma nova política na base de dados
      const [result] = await conn.execute(
        `INSERT INTO comissao_politica (ref, descricao) VALUES (?,?)`,
        [new Date(year, month - 1, 1), descricao]
      );
      const id_politica = result.insertId;
      if (!id_politica) {
        throw new Error(
          "Houve algum erro na criação de uma nova política"
        );
      }

      //* Insere os cargos da política atual na nova política
      for (const cargo of currentPolitica.cargos) {
        const [result] = await conn.execute(
          `INSERT INTO comissao_politica_cargos (id_politica, id_cargo, id_escalonamento) VALUES (?,?,?)`,
          [
            id_politica,
            cargo.id_cargo,
            cargo.id_escalonamento,
          ]
        );
        const id_cargo_politica = result.insertId;

        //* Insere os modelos da política atual na nova política
        for (const modelo of cargo.modelos) {
          let id_modelo = null;
          if (modelo.id) {
            const [result] = await conn.execute(
              `INSERT INTO comissao_politica_modelos (id_cargo_politica, descricao) VALUES (?,?)`,
              [
                id_cargo_politica,
                modelo.descricao,
              ]
            );
            id_modelo = result.insertId;
          }

          //* Insere as filiais relacionandas ao modelo
          for (const filial of modelo.filiais) {
            await conn.execute(
              `INSERT INTO comissao_politica_modelos_filiais (id_filial, id_cargo_politica, id_modelo) VALUES (?,?,?)`,
              [
                filial.id_filial,
                id_cargo_politica,
                id_modelo,
              ]
            );
          }

          //* Insere os itens do modelo na nova política
          for (const itemModelo of modelo.itens) {
            const [result] = await conn.execute(
              `
              INSERT INTO comissao_politica_itens (id_cargo_politica, id_modelo, id_segmento, tipo, tipo_premiacao) VALUES (?,?,?,?,?)
            `,
              [
                id_cargo_politica,
                id_modelo,
                itemModelo.id_segmento,
                itemModelo.tipo,
                itemModelo.tipo_premiacao,
              ]
            );
            const item_id = result.insertId;

            //* Insere os valores de escalonamento do item
            for (const escalonamento of itemModelo.escalonamento_itens) {
              await conn.execute(
                "INSERT INTO comissao_politica_itens_escalonamento (id_item_politica, percentual, valor) VALUES (?,?,?)",
                [
                  item_id,
                  escalonamento.percentual,
                  escalonamento.valor,
                ]
              );
            }
          }
        }
      }

      await conn.commit();
      resolve({
        message: "Sucesso",
        new_id_politica: id_politica,
      });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "COPY_POLITICA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
