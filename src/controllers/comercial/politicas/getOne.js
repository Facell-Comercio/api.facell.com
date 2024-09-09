const { formatDate } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    let { id } = req.query;

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        const [rowCurrentPolitica] =
          await conn.execute(
            `
          SELECT * FROM comissao_politica
          WHERE ref <= ?
          ORDER BY ref DESC
          LIMIT 1
        `,
            [new Date()]
          );

        const currentPolitica =
          rowCurrentPolitica &&
          rowCurrentPolitica[0];
        id = currentPolitica.id;
      }
      const [rowsPolitica] = await conn.execute(
        `
        SELECT * FROM comissao_politica
        WHERE id = ?
        `,
        [id]
      );
      const politica =
        rowsPolitica && rowsPolitica[0];
      if (!politica) {
        throw new Error(
          `Politica de id ${id} não encontrado`
        );
      }

      //* Recupera todos os cargos da política
      const [rowsCargos] = await conn.execute(
        `
        SELECT
          cpc.id,
          cc.cargo as nome,
          ce.descricao as escalonamento,
          cpc.id_escalonamento,
          cpc.id_cargo
        FROM comissao_politica_cargos cpc
        LEFT JOIN comissao_cargos cc ON cc.id = cpc.id_cargo
        LEFT JOIN comissao_escalonamentos ce ON ce.id = cpc.id_escalonamento
        WHERE id_politica = ?
        AND cc.tipo <> "filial"
        `,
        [politica.id]
      );

      //* Realiza uma iteração para pegar os dados de cada cargo
      for (const cargo of rowsCargos) {
        const [escalonamentoItens] =
          await conn.execute(
            `
          SELECT *
          FROM comissao_escalonamento_itens
          WHERE id_escalonamento = ?
          `,
            [cargo.id_escalonamento]
          );

        //* Adiciona o escalonamento de itens ao cargo
        cargo.escalonamento_itens =
          escalonamentoItens;

        //* Recupera todos os modelos relacionados ao cargo
        const [rowModelos] = await conn.execute(
          `
              SELECT *, id as id_modelo
              FROM comissao_politica_modelos
              WHERE id_cargo_politica = ?
            `,
          [cargo.id]
        );

        const modelos = [
          {
            id: null,
            descricao: "PADRÃO",
            id_cargo_politica: cargo.id,
          },
          ...rowModelos,
        ];

        for (const modelo of modelos) {
          //* Recupera todos os itens relacionados ao modelo
          const [rowItensModelos] =
            await conn.execute(
              `
              SELECT cpi.*, cs.*, cpi.id as id_item, cs.id as id_segmento
              FROM comissao_politica_itens cpi
              LEFT JOIN comissao_segmentos cs ON cs.id = cpi.id_segmento
              WHERE cpi.id_cargo_politica = ?
              AND ${
                modelo.id
                  ? "cpi.id_modelo = ?"
                  : "cpi.id_modelo IS NULL"
              }
            `,
              modelo.id
                ? [cargo.id, modelo.id]
                : [cargo.id]
            );

          for (const item of rowItensModelos) {
            //* Pega o escalonamento de cada item
            const [itensEscalonamento] =
              await conn.execute(
                `
                SELECT *, id as id_item_escalonamento
                FROM comissao_politica_itens_escalonamento
                WHERE id_item_politica = ?
              `,
                [item.id_item]
              );
            item.escalonamento_itens =
              itensEscalonamento;
          }

          //* Recupera todas as filiais relacionadas a esse modelo
          const [rowFiliais] = await conn.execute(
            `
              SELECT *
              FROM comissao_politica_modelos_filiais
              WHERE id_modelo =?
            `,
            [modelo.id]
          );

          modelo.filiais = rowFiliais;
          modelo.itens = rowItensModelos;
        }
        cargo.modelos = modelos;
      }

      //* Busca o próximo referente a partir da referência da política atual
      const [rowNextPolitica] =
        await conn.execute(
          `
        SELECT ref FROM comissao_politica
        WHERE ref > ?
        ORDER BY ref ASC
        LIMIT 1
      `,
          [politica.ref]
        );
      const nextPoliticaRef =
        rowNextPolitica &&
        rowNextPolitica[0] &&
        rowNextPolitica[0].ref;

      const refDate = `${formatDate(
        politica.ref,
        "MM/yyyy"
      )} - ${
        nextPoliticaRef
          ? formatDate(nextPoliticaRef, "MM/yyyy")
          : "VIGENTE"
      }`;

      const objResponse = {
        ...politica,
        refDate,
        cargos: rowsCargos,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "GET_ONE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
