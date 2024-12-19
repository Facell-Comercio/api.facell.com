import { logger } from "../../../../../../../logger";

const { db } = require("../../../../../../../mysql");

export const getQualidade = ({ meta }) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      conn.config.namedPlaceholders = true;

      let query = '';
      let params = {};
      let where = `WHERE
        AND ano = :ano 
        AND mes = :mes 
        AND filial = :filial
        `;
      if (!meta.ref) throw new Error(`Meta sem referência. Valor: ${meta.ref}`);
      if (!meta.filial) throw new Error(`Meta sem filial. Valor: ${meta.filial}`);

      params.ano = dateFormat(meta.ref, 'yyyy');
      params.mes = dateFormat(meta.ref, 'MM');
      params.filial = meta.filial;

      query = `SELECT qualidade FROM view_qualidade_tim_filial
          ${where} 
          `

      const { rowQualidadeTim } = await conn.execute(query, params)
      const data = rowQualidadeTim && rowQualidadeTim[0];
      if (!data) throw new Error(`Não foi possível buscar a qualidade ${params.mes}/${params.ano} da filial ${meta.filial}, pessoa: ${meta.nome}!`)

      resolve({ qualidade: parseFloat(data.qualidade) || 0})
    } catch (error) {
      reject(error)
      logger.error({
        module: 'COMERCIAL',
        origin: 'COMISSÃO',
        method: 'GET_QUALIDADE_TIM',
        data: { message: error.message, stack: error.stack, name: error.name }
    })
    } finally {
      if (conn) conn.release();
    }
  })
}