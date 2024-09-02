const { db } = require('../../../../../mysql');
const { logger } = require('../../../../../logger');
const { formatDate } = require('date-fns');
const { checkUserPermission } = require('../../../../helpers/checkUserPermission');

const getParcial = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      conn = await db.getConnection()
      conn.config.namedPlaceholders = true;

      const { range_data } = req.query || {}
      const { from, to } = range_data || {}
      const startDate = from && formatDate(from, 'yyyy-MM-dd')
      const endDate = to && formatDate(to, 'yyyy-MM-dd')

      // console.log(startDate, endDate)
      let whereFiliais = ' AND f.tim_cod_sap IS NOT NULL AND f.active = 1 '

      let whereVendas = ` v.tipoPedido IN ('Venda', 'Devolução') `
      const paramsVendas = {}

      let whereAtivacoes = ' 1=1 '
      const paramsAtivacoes = {}

      let ids_filiais_habilitadas;
      if(!(checkUserPermission(req, 'MASTER') || checkUserPermission('COMERCIAL_DASHBOARD_ADMIN'))){
        ids_filiais_habilitadas = req.user.filiais.map(filial=>filial.id_filial)
      }

      if(ids_filiais_habilitadas && ids_filiais_habilitadas.length){
        whereFiliais+= ` AND f.id IN('${ids_filiais_habilitadas.join("','")}')`
      }

      if (startDate && endDate) {
        whereVendas += ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') BETWEEN :startDate AND :endDate `
        paramsVendas.startDate = startDate;
        paramsVendas.endDate = endDate;

        whereAtivacoes += ` AND a.dtAtivacao BETWEEN :startDate AND :endDate `
        paramsAtivacoes.startDate = startDate;
        paramsAtivacoes.endDate = endDate;

      } else if (startDate) {
        whereVendas += ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') = :startDate `
        paramsVendas.startDate = startDate;

        whereAtivacoes += ` AND a.dtAtivacao = :startDate `
        paramsAtivacoes.startDate = startDate;

      } else if (endDate) {
        whereVendas += ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') = :endDate `
        paramsVendas.endDate = endDate;

        whereAtivacoes += ` AND a.dtAtivacao = :endDate `
        paramsAtivacoes.endDate = endDate;
      }

      const camposVendas = [
        "v.area as uf",
        "v.filial",
        "v.nomeVendedor as vendedor",
        "sum(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.qtde ELSE 0 END) as qtde_aparelho",
        "sum(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa ELSE 0 END) as aparelho",
        "sum(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.qtde ELSE 0 END) as qtde_acessorio",
        "sum(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa ELSE 0 END) as acessorio",
        "sum(CASE WHEN v.grupoEstoque LIKE '%PITZI%' THEN v.qtde ELSE 0 END) as qtde_pitzi",
        "sum(CASE WHEN v.grupoEstoque LIKE '%PITZI%' THEN v.valorCaixa ELSE 0 END) as pitzi",
      ];

      const camposAtivacoes = [
        "f.uf",
        "a.filial",
        "a.vendedor",
        "sum(CASE WHEN a.categoria = 'CONTROLE' THEN 1 ELSE 0 END) as controle",
        "sum(CASE WHEN a.categoria = 'PÓS PURO' THEN 1 ELSE 0 END) as pos",
        "sum(CASE WHEN a.modalidade LIKE 'UPGR%' THEN 1 ELSE 0 END) as upgrade",
        "sum(CASE WHEN NOT a.tipo_movimento = 'UPGRADE 2' THEN COALESCE(a.valor_receita, 0) ELSE 0 END) as receita",

        "sum(CASE WHEN a.categoria = 'WTTX' OR a.categoria = 'TIM FIXO' THEN 1 ELSE 0 END) as residenciais",
        "sum(CASE WHEN a.categoria = 'LIVE' THEN 1 ELSE 0 END) as live",
        "sum(CASE WHEN a.modalidade LIKE 'PORT%' THEN 1 ELSE 0 END) as portab",
      ];

      const queryVendas = `
        -- Vendas FACELL
        SELECT ${camposVendas.join(',')} 
        FROM datasys_vendas v 
        INNER JOIN filiais f ON f.nome = v.filial
        WHERE 
        ${whereVendas}
        ${whereFiliais}
        GROUP BY v.filial, v.nomeVendedor
        `;

      const queryVendasFort = `
        -- Vendas FORT
        SELECT ${camposVendas.join(',')} 
        FROM datasys_vendas_fort v
        INNER JOIN filiais f ON f.nome = v.filial
        WHERE 
        ${whereVendas}
        ${whereFiliais}
        GROUP BY v.filial, v.nomeVendedor
        `;

      const queryAtivacoes = `
        -- Ativações Facell
        SELECT ${camposAtivacoes.join(',')} FROM datasys_ativacoes a 
        LEFT JOIN filiais f ON f.nome = a.filial
        WHERE 
        ${whereAtivacoes}
        ${whereFiliais}
        GROUP BY a.filial, a.vendedor
        `;

      const queryAtivacoesFort = `
        -- Ativações FORT
        SELECT ${camposAtivacoes.join(',')} FROM datasys_ativacoes_fort a 
        LEFT JOIN filiais f ON f.nome = a.filial
        WHERE 
        ${whereAtivacoes}
        ${whereFiliais}
        GROUP BY a.filial, a.vendedor
        `;

      const [[vendas], [vendasFort], [ativacoes], [ativacoesFort]] = await Promise.all([
        conn.execute(queryVendas, paramsVendas),
        conn.execute(queryVendasFort, paramsVendas),
        conn.execute(queryAtivacoes, paramsAtivacoes),
        conn.execute(queryAtivacoesFort, paramsAtivacoes),
      ]);
      
      resolve({ rows: [...vendas, ...vendasFort, ...ativacoes, ...ativacoesFort] });
    } catch (error) {
      logger.error({
        module: 'COMERCIAL', origin: 'PARCIAL', method: 'GET_PARCIAL',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });

};

const getDetalheParcial = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      conn = await db.getConnection()
      conn.config.namedPlaceholders = true;

      const { range_data, tipo, chave } = req.query || {}
      const { from, to } = range_data || {}
      const startDate = from && formatDate(from, 'yyyy-MM-dd')
      const endDate = to && formatDate(to, 'yyyy-MM-dd')

      // console.log(startDate, endDate)
      let whereFiliais = ' AND f.tim_cod_sap IS NOT NULL AND f.active = 1 '

      let whereVendas = ` v.tipoPedido IN ('Venda', 'Devolução') `
      const paramsVendas = {}

      let whereAtivacoes = ' 1=1 '
      const paramsAtivacoes = {}

      let ids_filiais_habilitadas;
      if(!(checkUserPermission(req, 'MASTER') || checkUserPermission('COMERCIAL_DASHBOARD_ADMIN'))){
        ids_filiais_habilitadas = req.user.filiais.map(filial=>filial.id_filial)
      }
      
      if(ids_filiais_habilitadas && ids_filiais_habilitadas.length){
        whereFiliais+= ` AND f.id IN('${ids_filiais_habilitadas.join("','")}')`
      }
      
      if(tipo && tipo == 'vendedor'){
        whereVendas += ` AND v.nomeVendedor = :vendedor `
        whereAtivacoes+= ` AND a.vendedor = :vendedor `

        paramsAtivacoes.vendedor = chave 
        paramsVendas.vendedor = chave 
      }

      if(tipo && tipo == 'filial'){
        whereVendas += ` AND v.filial = :filial `
        whereAtivacoes+= ` AND a.filial = :filial `

        paramsAtivacoes.filial = chave 
        paramsVendas.filial = chave 
      }

      if (startDate && endDate) {
        whereVendas += ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') BETWEEN :startDate AND :endDate `
        paramsVendas.startDate = startDate;
        paramsVendas.endDate = endDate;

        whereAtivacoes += ` AND a.dtAtivacao BETWEEN :startDate AND :endDate `
        paramsAtivacoes.startDate = startDate;
        paramsAtivacoes.endDate = endDate;

      } else if (startDate) {
        whereVendas += ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') = :startDate `
        paramsVendas.startDate = startDate;

        whereAtivacoes += ` AND a.dtAtivacao = :startDate `
        paramsAtivacoes.startDate = startDate;

      } else if (endDate) {
        whereVendas += ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') = :endDate `
        paramsVendas.endDate = endDate;

        whereAtivacoes += ` AND a.dtAtivacao = :endDate `
        paramsAtivacoes.endDate = endDate;
      }

      const camposVendas = [
        "'venda' as tipo",
        "v.area as uf",
        "v.filial",
        "v.nomeVendedor",
        "v.grupoEstoque",
        "v.subgrupo",
        "v.descrComercial as descricao",
        "v.valorCaixa as valor",
        "v.qtde",
        "v.grupo_economico",
        "v.dataPedido",
        "v.tipoPedido",
        "v.numeroPedido",
        "v.planoHabilitacao",
        "v.grupo_economico",
      ];

      const camposAtivacoes = [
        "'ativacao' as tipo",
        "f.uf",
        "a.filial",
        "a.vendedor",
        "a.modalidade",
        "a.plaOpera",
        "a.categoria",
        "a.statusLinha",
        "a.dtAtivacao",
        "a.grupo_economico",
        "a.tipo_movimento",
        `CASE 
        WHEN a.tipo_movimento = 'UPGRADE 2' THEN 0
        ELSE a.valor_receita
        END AS valor`,
        "a.grupo_economico",
        "1 as qtde"
      ];

      const queryVendas = `
        -- Vendas FACELL
        SELECT ${camposVendas.join(',')} 
        FROM datasys_vendas v 
        INNER JOIN filiais f ON f.nome = v.filial
        WHERE 
        ${whereVendas}
        ${whereFiliais}
        `;

      const queryVendasFort = `
        -- Vendas FORT
        SELECT ${camposVendas.join(',')} 
        FROM datasys_vendas_fort v
        INNER JOIN filiais f ON f.nome = v.filial
        WHERE 
        ${whereVendas}
        ${whereFiliais}
        `;

      const queryAtivacoes = `
        -- Ativações Facell
        SELECT ${camposAtivacoes.join(',')} FROM datasys_ativacoes a 
        INNER JOIN filiais f ON f.nome = a.filial
        WHERE 
        ${whereAtivacoes}
        ${whereFiliais}
        `;

      const queryAtivacoesFort = `
        -- Ativações FORT
        SELECT ${camposAtivacoes.join(',')} FROM datasys_ativacoes_fort a 
        INNER JOIN filiais f ON f.nome = a.filial
        WHERE 
        ${whereAtivacoes}
        ${whereFiliais}
        `;

      const [[vendas], [vendasFort], [ativacoes], [ativacoesFort]] = await Promise.all([
        conn.execute(queryVendas, paramsVendas),
        conn.execute(queryVendasFort, paramsVendas),
        conn.execute(queryAtivacoes, paramsAtivacoes),
        conn.execute(queryAtivacoesFort, paramsAtivacoes),
      ]);
      
      resolve({ rows: [...vendas, ...vendasFort, ...ativacoes, ...ativacoesFort] });
    } catch (error) {
      logger.error({
        module: 'COMERCIAL', origin: 'PARCIAL', method: 'GET_PARCIAL',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });

};


module.exports = {
  getParcial, getDetalheParcial
};
