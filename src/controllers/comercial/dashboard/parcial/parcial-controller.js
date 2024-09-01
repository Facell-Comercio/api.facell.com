const { db } = require('../../../../../mysql');
const { logger } = require('../../../../../logger');
const { formatDate } = require('date-fns');

const obterParcial = (req) => {
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
            let whereVendasFort = ` vf.tipoPedido IN ('Venda', 'Devolução') `
            const paramsVendas = {}

            let whereAtivacoes = ' 1=1 '
            let whereAtivacoesFort = ' 1=1 '
            const paramsAtivacoes = {}

            if(startDate && endDate){
                whereVendas+= ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') BETWEEN :startDate AND :endDate `
                whereVendasFort+= ` AND DATE_FORMAT(vf.dataPedido, '%Y-%m-%d') BETWEEN :startDate AND :endDate `
                paramsVendas.startDate = startDate;
                paramsVendas.endDate = endDate;

                whereAtivacoes += ` AND a.dtAtivacao BETWEEN :startDate AND :endDate `
                whereAtivacoesFort += ` AND af.dtAtivacao BETWEEN :startDate AND :endDate `
                paramsAtivacoes.startDate = startDate;
                paramsAtivacoes.endDate = endDate;

            }else if(startDate){
                whereVendas+= ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') = :startDate `
                whereVendasFort+= ` AND DATE_FORMAT(vf.dataPedido, '%Y-%m-%d') = :startDate `
                paramsVendas.startDate = startDate;

                whereAtivacoes += ` AND a.dtAtivacao = :startDate `
                whereAtivacoesFort += ` AND af.dtAtivacao = :startDate `
                paramsAtivacoes.startDate = startDate;

            }else if(endDate){
                whereVendas+= ` AND DATE_FORMAT(v.dataPedido, '%Y-%m-%d') = :endDate `
                whereVendasFort+= ` AND DATE_FORMAT(vf.dataPedido, '%Y-%m-%d') = :endDate `
                paramsVendas.endDate = endDate;

                whereAtivacoes += ` AND a.dtAtivacao = :endDate `
                whereAtivacoesFort += ` AND af.dtAtivacao = :endDate `
                paramsAtivacoes.endDate = endDate;
            }
            

            const camposVendas = [
                "v.area as uf",
                "v.filial",
                "v.nomeVendedor",
                "v.grupoEstoque",
                "v.subgrupo",
                "v.descrComercial as descricao",
                "sum(v.valorCaixa) as valor",
                "sum(v.qtde) as qtde",
                "v.grupo_economico",
                "v.dataPedido",
                "v.tipoPedido",
                "v.numeroPedido",
                "v.planoHabilitacao",
                "v.grupo_economico",
            ];
            const camposVendasFort = [
                "vf.area as uf",
                "vf.filial",
                "vf.nomeVendedor",
                "vf.grupoEstoque",
                "vf.subgrupo",
                "vf.descrComercial as descricao",
                "sum(vf.valorCaixa) as valor",
                "sum(vf.qtde) as qtde",
                "vf.grupo_economico",
                "vf.dataPedido",
                "vf.tipoPedido",
                "vf.numeroPedido",
                "vf.planoHabilitacao",
                "vf.grupo_economico",
            ];
            const camposAtivacoes = [
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
                "a.pedido",
                "a.grupo_economico",
                " '1' as qtde"
            ];
            const camposAtivacoesFort = [
                "f.uf",
                "af.filial",
                "af.vendedor",
                "af.modalidade",
                "af.plaOpera",
                "af.categoria",
                "af.statusLinha",
                "af.dtAtivacao",
                "af.grupo_economico",
                "af.tipo_movimento",
                `CASE 
        WHEN af.tipo_movimento = 'UPGRADE 2' THEN 0
        ELSE af.valor_receita
        END AS valor`,
                "af.pedido",
                "af.grupo_economico",
                " '1' as qtde"
            ];


            const queryVendas = `SELECT ${camposVendas.join(',')} 
            FROM datasys_vendas v 
            INNER JOIN filiais f ON f.nome = v.filial
          WHERE 
            ${whereVendas}
            ${whereFiliais}
            GROUP BY v.filial, v.nomeVendedor, v.grupoEstoque, v.codProduto
            
          UNION

          SELECT ${camposVendasFort.join(',')} 
          FROM datasys_vendas_fort vf
          INNER JOIN filiais f ON f.nome = vf.filial
          WHERE 
            ${whereVendasFort}
            ${whereFiliais}
            GROUP BY vf.filial, vf.nomeVendedor, vf.grupoEstoque, vf.codProduto

            `    

            const [filiais, vendas, ativacoes] = await Promise.all([
                conn.execute(`SELECT f.uf, f.nome as filial FROM filiais f WHERE 1=1
        ${whereFiliais}
        `),

                conn.execute(queryVendas, paramsVendas
                ),
                conn.execute(
                    `SELECT ${camposAtivacoes.join(',')} FROM datasys_ativacoes a 
          LEFT JOIN filiais f ON f.nome = a.filial
          WHERE 
          ${whereAtivacoes}
          ${whereFiliais}

          UNION
          
          SELECT ${camposAtivacoesFort.join(',')} FROM datasys_ativacoes_fort af 
          LEFT JOIN filiais f ON f.nome = af.filial
          WHERE 
          ${whereAtivacoesFort}
          ${whereFiliais}

          `, paramsAtivacoes
                ),
            ]);

            resolve({ filiais: filiais[0], vendas: vendas[0], ativacoes: ativacoes[0] });
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

function gerarQueryParcialResumida({ grupo_economico, segmento }) {
    const grupo_economico_local = grupo_economico;
    const segmento_local = segmento;

    if (!grupo_economico_local || !segmento_local) return null;
    let query;
    const datasys_ativacoes = grupo_economico_local === 'FACELL' ? 'datasys_ativacoes' : 'datasys_ativacoes_fort';
    const datasys_vendas = grupo_economico_local === 'FACELL' ? 'datasys_vendas' : 'datasys_vendas_fort';

    if (segmento_local === 'gross') {
        query = `SELECT f.label, count(a.id) as qtde FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                (a.categoria = 'PÓS PURO' OR a.categoria = 'CONTROLE') and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }

    if (segmento_local === 'pos') {
        query = `SELECT f.label, count(a.id) as qtde FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                a.categoria = 'PÓS PURO' and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'controle') {
        query = `SELECT f.label, count(a.id) as qtde FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                a.categoria = 'CONTROLE' and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'live') {
        query = `SELECT f.label, count(a.id) as qtde FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                a.categoria = 'LIVE' and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'up') {
        query = `SELECT f.label, count(a.id) as qtde FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                a.tipo_movimento LIKE '%UPGRADE%' and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'up1') {
        query = `SELECT f.label, count(a.id) as qtde FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                a.tipo_movimento = 'UPGRADE 1' and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'up2') {
        query = `SELECT f.label, count(a.id) as qtde FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                a.tipo_movimento   = 'UPGRADE 2' and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'receita') {
        query = `SELECT f.label, sum(a.valor_receita) as valor FROM ${datasys_ativacoes} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dtAtivacao) = CURDATE() and
                NOT a.tipo_movimento = 'UPGRADE 2' and
                NOT a.statusLinha = 'VENDA IRREGULAR' and
                NOT a.statusLinha = 'CANCELADA' and
                NOT a.statusLinha = 'DUPLICIDADE'
              GROUP BY f.label
              ORDER BY valor DESC
              `
    }

    if (segmento_local === 'aparelho') {
        query = `SELECT f.label, count(a.id) as qtde, sum(a.valorCaixa) as valor FROM ${datasys_vendas} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dataPedido) = CURDATE() and
                a.grupoEstoque = 'APARELHO' and
                a.tipoPedido = 'Venda'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'acessorio') {
        query = `SELECT f.label, count(a.id) as qtde, sum(a.valorCaixa) as valor FROM ${datasys_vendas} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dataPedido) = CURDATE() and
                a.grupoEstoque LIKE '%ACESS%' and
                a.tipoPedido = 'Venda'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }
    if (segmento_local === 'pitzi') {
        query = `SELECT f.label, count(a.id) as qtde, sum(a.valorCaixa) as valor FROM ${datasys_vendas} a 
              RIGHT JOIN facell_filiais f ON  f.filial = a.filial
              WHERE 
                DATE(a.dataPedido) = CURDATE() and
                a.grupoEstoque LIKE '%GARANTIAS%' and
                a.tipoPedido = 'Venda'
              GROUP BY f.label
              ORDER BY qtde DESC
              `
    }

    return query;
}

function obterParcialSegmentada(body) {
    return new Promise(async (resolve, reject) => {
        if (body && !body.segmento) {
            reject('Sem segmento!')
        }
        const segmento = body.segmento;
        var parcial = []

        try {
            const queryFacell = gerarQueryParcialResumida({ grupo_economico: 'FACELL', segmento })
            const [resumoFacell] = await conn.execute(queryFacell)

            const queryFort = gerarQueryParcialResumida({ grupo_economico: 'FORTTELECOM', segmento })
            const [resumoFort] = await conn.execute(queryFort)

            parcial.push({ grupo_economico: 'FACELL', lojas: resumoFacell })
            parcial.push({ grupo_economico: 'FORTTELECOM', lojas: resumoFort })

            resolve(parcial)

        } catch (error) {
            console.log('[PARCIAL_SEGMENTADA]: ', error)
            reject('Houve um erro ao tentar processar a parcial...')
        }
    })
}

function obterParcialResumida(body) {
    return new Promise(async (resolve, reject) => {

        try {
            const [filiais] = await conn.execute('SELECT id, label FROM facell_filiais')

            const [resumoAtivacoes] = await conn.execute(`
    SELECT 
      f.id,
      f.grupo_economico, 
      f.label,
      COUNT(CASE WHEN v.categoria = 'PÓS PURO' THEN v.id END) as pos,
      COUNT(CASE WHEN v.categoria = 'CONTROLE' THEN v.id END) as controle,
      SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita,
      COUNT(CASE WHEN v.categoria = 'LIVE' THEN v.id END) as live 
    FROM
        facell_filiais f
    LEFT JOIN
        datasys_ativacoes v ON v.filial = f.filial
        AND DATE(v.dtAtivacao) = CURDATE() 
        AND NOT v.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')
    WHERE
      f.grupo_economico = 'FACELL'
    GROUP BY
        f.grupo_economico, f.label

    UNION

    SELECT 
        f2.id,
        f2.grupo_economico, 
        f2.label,
        COUNT(CASE WHEN v2.categoria = 'PÓS PURO' THEN v2.id END) as pos,
        COUNT(CASE WHEN v2.categoria = 'CONTROLE' THEN v2.id END) as controle,
        SUM(CASE WHEN v2.tipo_movimento <> 'UPGRADE 2' THEN v2.valor_receita END) as receita,
        COUNT(CASE WHEN v2.categoria = 'LIVE' THEN v2.id END) as live 
    FROM
        facell_filiais f2
    LEFT JOIN
        datasys_ativacoes_fort v2 ON v2.filial = f2.filial
        AND DATE(v2.dtAtivacao) = CURDATE() 
        AND NOT v2.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')
    WHERE
        f2.grupo_economico = 'FORTTELECOM'
    GROUP BY
        f2.grupo_economico, f2.label
    ORDER BY
        id;
    `)

            const [resumoVendas] = await conn.execute(`
    SELECT 
      f.id,
      f.grupo_economico, 
      f.label,
      COUNT(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.id END) as qtdeAparelho,
      SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,

      COUNT(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.id END) as qtdeAcessorio,
      SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa END) as acessorio,

      SUM(CASE WHEN v.grupoEstoque LIKE '%GARANTIAS%' OR v.grupoEstoque LIKE '%PITZI%' THEN v.valorCaixa END) as pitzi

    FROM
        facell_filiais f
    LEFT JOIN
        datasys_vendas v ON v.filial = f.filial
        AND v.tipoPedido = 'Venda'
        AND DATE(v.dataPedido) = CURDATE() 
    WHERE
      f.grupo_economico = 'FACELL'
    GROUP BY
        f.grupo_economico, f.label

    UNION

    SELECT 
        f2.id,
        f2.grupo_economico, 
        f2.label,
        COUNT(CASE WHEN v2.grupoEstoque = 'APARELHO' THEN v2.id END) as qtdeAparelho,
        SUM(CASE WHEN v2.grupoEstoque = 'APARELHO' THEN v2.valorCaixa END) as aparelho,

        COUNT(CASE WHEN v2.grupoEstoque LIKE '%ACESS%' THEN v2.id END) as qtdeAcessorio,
        SUM(CASE WHEN v2.grupoEstoque LIKE '%ACESS%' THEN v2.valorCaixa END) as acessorio,

        SUM(CASE WHEN v2.grupoEstoque LIKE '%GARANTIAS%' OR v2.grupoEstoque LIKE '%PITZI%' THEN v2.valorCaixa END) as pitzi
    FROM
        facell_filiais f2
    LEFT JOIN
        datasys_vendas_fort v2 ON v2.filial = f2.filial
        AND v2.tipoPedido = 'Venda'
        AND DATE(v2.dataPedido) = CURDATE() 
    WHERE
        f2.grupo_economico = 'FORTTELECOM'
    GROUP BY
        f2.grupo_economico, f2.label
    ORDER BY
        id;
    `)

            resolve({
                filiais,
                ativacoes: resumoAtivacoes,
                vendas: resumoVendas
            })
        } catch (error) {
            console.log('[PARCIAL_RESUMIDA]: ', error)
            reject(error)
        }
    })
}

function obterParcialDetalhada(body) {
    return new Promise(async (resolve, reject) => {
        const filial = body?.filial

        var filtroFilial = ''
        if (filial) {
            filtroFilial = ` and filial = '${filial}' `
        }
        try {
            const grupos = [
                { grupo_economico: 'FACELL', datasys_vendas: 'datasys_vendas', datasys_ativacoes: 'datasys_ativacoes' },
                { grupo_economico: 'FORTTELECOM', datasys_vendas: 'datasys_vendas_fort', datasys_ativacoes: 'datasys_ativacoes_fort' },
            ]
            const segmentos = [
                'pos', 'controle', 'live', 'receita', 'aparelho', 'acessorio', 'pitzi', 'up', 'up1', 'up2'
            ]

            const parcial = [];
            for (const grupo of grupos) {
                const parcial_grupo = { grupo_economico: grupo.grupo_economico, segmentos: [] }

                for (const segmento of segmentos) {

                    let query;
                    if (segmento === 'gross') {
                        query = `SELECT f.label, a.vendedor, count(a.id) as qtde FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        (a.categoria = 'PÓS PURO' OR a.categoria = 'CONTROLE') and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'pos') {
                        query = `SELECT f.label, a.vendedor, count(a.id) as qtde FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        a.categoria = 'PÓS PURO' and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'controle') {
                        query = `SELECT f.label, a.vendedor, count(a.id) as qtde FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        a.categoria = 'CONTROLE' and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'live') {
                        query = `SELECT f.label, a.vendedor, count(a.id) as qtde FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        a.categoria = 'LIVE' and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'up') {
                        query = `SELECT f.label, a.vendedor, count(a.id) as qtde FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        a.tipo_movimento LIKE '%UPGRADE%' and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'up1') {
                        query = `SELECT f.label, a.vendedor, count(a.id) as qtde FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        a.tipo_movimento = 'UPGRADE 1' and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'up2') {
                        query = `SELECT f.label, a.vendedor, count(a.id) as qtde FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        a.tipo_movimento   = 'UPGRADE 2' and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'receita') {
                        query = `SELECT f.label, a.vendedor, sum(a.valor_receita) as valor FROM ${grupo.datasys_ativacoes} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dtAtivacao) = CURDATE() and
                        NOT a.tipo_movimento = 'UPGRADE 2' and
                        NOT a.statusLinha = 'VENDA IRREGULAR' and
                        NOT a.statusLinha = 'CANCELADA' and
                        NOT a.statusLinha = 'DUPLICIDADE'
                      GROUP BY f.label, a.vendedor
                      ORDER BY valor DESC
                      `
                    }

                    if (segmento === 'aparelho') {
                        query = `SELECT f.label, a.nomeVendedor, count(a.id) as qtde, sum(a.valorCaixa) as valor FROM ${grupo.datasys_vendas} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dataPedido) = CURDATE() and
                        a.grupoEstoque = 'APARELHO' and
                        a.tipoPedido = 'Venda'
                      GROUP BY f.label, a.nomeVendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'acessorio') {
                        query = `SELECT f.label, a.nomeVendedor, count(a.id) as qtde, sum(a.valorCaixa) as valor FROM ${grupo.datasys_vendas} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dataPedido) = CURDATE() and
                        a.grupoEstoque LIKE '%ACESS%' and
                        a.tipoPedido = 'Venda'
                      GROUP BY f.label, a.nomeVendedor
                      ORDER BY qtde DESC
                      `
                    }
                    if (segmento === 'pitzi') {
                        query = `SELECT f.label, a.nomeVendedor, count(a.id) as qtde, sum(a.valorCaixa) as valor FROM ${grupo.datasys_vendas} a 
                      RIGHT JOIN facell_filiais f ON  f.filial = a.filial
                      WHERE 
                        DATE(a.dataPedido) = CURDATE() and
                        a.grupoEstoque LIKE '%GARANTIAS%' and
                        a.tipoPedido = 'Venda'
                      GROUP BY f.label, a.nomeVendedor
                      ORDER BY qtde DESC
                      `
                    }

                    const [query_result] = await conn.execute(query)
                    parcial_grupo.segmentos.push(query_result)
                }
                parcial.push(parcial_grupo)
            }


            resolve(parcial)

        } catch (error) {
            console.log('[PARCIAL_DETALHADA]: ', error)
            reject('Houve um erro ao tentar processar a parcial...')
        }
    })
}



module.exports = {
    obterParcial, obterParcialSegmentada, obterParcialResumida, obterParcialDetalhada
};
