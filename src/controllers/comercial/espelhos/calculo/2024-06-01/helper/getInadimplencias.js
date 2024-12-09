import { formatDate, subMonths } from "date-fns";
import { db } from "../../../../../../../mysql";

export const getInadimplencias = ({ meta }) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      conn.config.namedPlaceholders = true;

      let query = "";
      let params = {};
      let where = `WHERE 
        movivo = 'INADIMPLÊNCIA' 
        AND ref = :ref 
        AND data_venda BETWEEN :data_inicial AND :data_final
        `;
      if (!meta.ref) throw new Error(`Meta sem referência. Valor: ${meta.ref}`);
      if (!meta.data_inicial) throw new Error(`Meta sem data_inicial. Valor: ${meta.data_inicial}`);
      if (!meta.data_final) throw new Error(`Meta sem data_final. Valor: ${meta.data_final}`);

      params.ref = formatDate(subMonths(meta.ref, 1), "yyyy-MM-dd");
      params.data_inicial = formatDate(subMonths(meta.data_inicial, 1), "yyyy-MM-dd");
      params.data_final = formatDate(subMonths(meta.data_final, 1), "yyyy-MM-dd");

      if (!meta.tipo) throw new Error('Meta sem informação de tipo: "meta/agregador"');
      if (meta?.tipo == "meta") {
        query = `SELECT 
          SUM(CASE WHEN segmento = 'CONTROLE' THEN 1 ELSE 0 END) as controle,
          SUM(CASE WHEN segmento = 'PÓS PURO' THEN 1 ELSE 0 END) as pos,
          SUM(CASE WHEN segmento = 'CONTROLE' OR segmento = 'PÓS PURO' THEN valor ELSE 0 END) as receita
          FROM comissao_vendas_invalidas 
          ${where} 
          `;
        where += ` AND cpf = :cpf `;
        params.cpf = meta.cpf;
      } else {
        let metas_agregadas = meta.metas_agregadas?.split(";") || [];
        if (!metas_agregadas || metas_agregadas.length === 0) {
          throw new Error(
            `Agregador ${meta.nome} sem metas agregadas! Inclua-as em comercial/metas > agregadores.`
          );
        }

        if (meta.tipo_agregacao == "FILIAL") {
          query = `SELECT 
          SUM(CASE WHEN segmento = 'CONTROLE' THEN 1 ELSE 0 END) as controle,
          SUM(CASE WHEN segmento = 'PÓS PURO' THEN 1 ELSE 0 END) as pos,
          SUM(CASE WHEN segmento = 'CONTROLE' OR segmento = 'PÓS PURO' THEN valor ELSE 0 END) as receita
          FROM comissao_vendas_invalidas 
          ${where} 
          `;
          where += ` AND filial IN(${metas_agregadas.map((value) => db.escape(value))})  `;
        } else {
          query = `SELECT 
          SUM(CASE WHEN segmento = 'CONTROLE' THEN 1 ELSE 0 END) as controle,
          SUM(CASE WHEN segmento = 'PÓS PURO' THEN 1 ELSE 0 END) as pos,
          SUM(CASE WHEN segmento = 'CONTROLE' OR segmento = 'PÓS PURO' THEN valor ELSE 0 END) as receita
          FROM comissao_vendas_invalidas 
          ${where} 
          `;
          where += ` cpf IN(${metas_agregadas.join(",")})`;
        }
      }
      const { rowVendasInvalidas } = await conn.execute(query, params);
      const data = rowVendasInvalidas && rowVendasInvalidas[0];
      if (!data) throw new Error("Não foi possível buscar as inadimplências!");

      resolve({
        controle: parseInt(data.controle) || 0,
        pos: parseInt(data.pos) || 0,
        receita: parseFloat(data.receita) || 0,
      });
    } catch (error) {
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
