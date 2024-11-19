const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { subMonths, formatDate } = require("date-fns");
const rateioAutomaticoVendasInvalidas = require("./rateioAutomaticoVendasInvalidas");
const XLSX = require("xlsx");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { mes, ano } = req.body;

    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();
    let whereInadimplente = `
      WHERE 1=1
      AND fd.status_inadimplencia = 'Inadimplente'
      AND (
        fd.modalidade LIKE 'PORT%' OR
        fd.modalidade LIKE 'ATIV%' OR
        fd.modalidade LIKE 'MIGR%' OR
        fd.modalidade LIKE 'DEPEN%' OR
        fd.modalidade LIKE 'UPGR%'
      ) `;
    let whereServico = `
      WHERE 1=1
      AND NOT modalidade LIKE '%TROCA%'
      AND (
        (thales_status_servico NOT LIKE 'liberado' AND thales_status_servico IS NOT NULL) OR
        status_ativacao NOT LIKE 'Ativo'
      ) `;

    let whereProduto = `
      WHERE 1=1
      AND NOT fd.imei IS NULL
      AND (
        (fd.thales_status_aparelho NOT LIKE 'liberado' AND fd.thales_status_aparelho IS NOT NULL) OR
        fd.status_fid_aparelho NOT LIKE 'Fidelizado'
      )
      AND (
        dpr.detalhe_reembolso LIKE 'PRICE OFERTA' OR
        dpr.detalhe_reembolso LIKE 'ADM' OR
        dpr.detalhe_reembolso LIKE 'REBATE'
      )
      AND dv.tipoPedido NOT LIKE 'Devolução'
      `;

    let whereProdutoPrice = `
      WHERE 1=1
      AND NOT imei IS NULL
      AND modalidade LIKE '%APARELHO%'
      AND NOT fidAparelho LIKE 'SIM'
      AND NOT status_ativacao LIKE 'ATIVO'
      AND NOT status_ativacao LIKE 'ANALISE PENDENTE' `;
    let whereDelete = " WHERE 1=1 AND vic.id IS NULL AND vi.status LIKE 'em_analise' ";
    const paramsInadimplente = [];
    const paramsServico = [];
    const paramsProduto = [];
    const paramsProdutoPrice = [];
    const paramsDelete = [];
    const dtRefInadimplente = subMonths(new Date(ano, mes - 1, 1));
    if (mes) {
      whereInadimplente += ` AND MONTH(fd.dtAtivacao) = ? `;
      paramsInadimplente.push(dtRefInadimplente.getMonth() + 1);

      whereServico += ` AND MONTH(fd.dtAtivacao) = ? `;
      paramsServico.push(mes);

      whereProduto += ` AND MONTH(fd.dtAtivacao) = ? `;
      paramsProduto.push(mes);

      whereProdutoPrice += ` AND MONTH(fd.dtAtivacao) = ? `;
      paramsProdutoPrice.push(mes);

      whereDelete += ` AND MONTH(vi.ref) = ? `;
      paramsDelete.push(mes);
    }
    if (ano) {
      whereInadimplente += ` AND YEAR(fd.dtAtivacao) = ? `;
      paramsInadimplente.push(dtRefInadimplente.getFullYear());

      whereServico += ` AND YEAR(fd.dtAtivacao) = ? `;
      paramsServico.push(ano);

      whereProduto += ` AND YEAR(fd.dtAtivacao) = ? `;
      paramsProduto.push(ano);

      whereProdutoPrice += ` AND YEAR(fd.dtAtivacao) = ? `;
      paramsProdutoPrice.push(ano);

      whereDelete += ` AND YEAR(vi.ref) = ? `;
      paramsDelete.push(ano);
    }

    //* INADIMPLÊNCIAS
    const [inadimplenciasFacell] = await conn.execute(
      `SELECT *, "INADIMPLÊNCIA" as tipo, "INADIMPLENTE" as motivo FROM facell_docs fd ${whereInadimplente}`,
      paramsInadimplente
    );
    const [inadimplenciasFort] = await conn.execute(
      `SELECT *, "INADIMPLÊNCIA" as tipo, "INADIMPLENTE" as motivo FROM facell_docs_fort fd ${whereInadimplente}`,
      paramsInadimplente
    );

    //* SERVIÇOS
    const [servicosFacell] = await conn.execute(
      `SELECT *,
       "SERVIÇO" AS tipo,
        CASE
            WHEN thales_status_servico NOT LIKE 'liberado' AND thales_status_servico IS NOT NULL THEN 'DOCUMENTAÇÃO'
            WHEN status_ativacao NOT LIKE 'Ativo' THEN 'ATIVAÇÃO'
            ELSE NULL
        END AS motivo
      FROM facell_docs fd
      ${whereServico}
      `,
      paramsServico
    );
    const [servicosFort] = await conn.execute(
      `SELECT *,
       "SERVIÇO" AS tipo,
        CASE
            WHEN thales_status_servico NOT LIKE 'liberado' AND thales_status_servico IS NOT NULL THEN 'DOCUMENTAÇÃO'
            WHEN status_ativacao NOT LIKE 'Ativo' THEN 'ATIVAÇÃO'
            ELSE NULL
        END AS motivo
      FROM facell_docs_fort fd
      ${whereServico}
      `,
      paramsServico
    );

    //* PRODUTOS
    const [produtosFacell] = await conn.execute(
      `SELECT fd.*,
        COALESCE(dpr.valor_reembolso,NULL) as valor_reembolso,
        dpr.detalhe_reembolso,
        dv.valorCaixa as valor_receita,
        fd.obs_doc_adm as teste1, fd.obs_fid_adm as teste2,
        CONCAT(COALESCE(fd.obs_doc_adm, ''), '\n', COALESCE(fd.obs_fid_adm, '')) AS observacao,
        "PRODUTO" AS tipo,
        "APARELHO" AS datasys_categoria,
        CASE
            WHEN thales_status_aparelho NOT LIKE 'liberado' AND thales_status_aparelho IS NOT NULL THEN 'DOCUMENTAÇÃO'
            WHEN status_fid_aparelho NOT LIKE 'Fidelizado' THEN 'FIDELIZAÇÃO'
            ELSE NULL
        END AS motivo
      FROM datasys_projecao_reembolsos dpr
      LEFT JOIN facell_docs fd ON fd.imei = dpr.serial
      LEFT JOIN datasys_vendas dv ON dv.serial = fd.imei
      ${whereProduto}
      `,
      paramsProduto
    );

    const [produtosFort] = await conn.execute(
      `SELECT fd.*,
        COALESCE(dpr.valor_reembolso,NULL) as valor_reembolso,
        dpr.detalhe_reembolso,
        dv.valorCaixa as valor_receita,
        fd.obs_doc_adm as teste1, fd.obs_fid_adm as teste2,
        CONCAT(COALESCE(fd.obs_doc_adm, ''), '\n', COALESCE(fd.obs_fid_adm, '')) AS observacao,
        "PRODUTO" AS tipo,
        "APARELHO" AS datasys_categoria,
        CASE
            WHEN thales_status_aparelho NOT LIKE 'liberado' AND thales_status_aparelho IS NOT NULL THEN 'DOCUMENTAÇÃO'
            WHEN status_fid_aparelho NOT LIKE 'Fidelizado' THEN 'FIDELIZAÇÃO'
            ELSE NULL
        END AS motivo
      FROM datasys_projecao_reembolsos dpr
      LEFT JOIN facell_docs_fort fd ON fd.imei = dpr.serial
      LEFT JOIN datasys_vendas_fort dv ON dv.serial = fd.imei
      ${whereProduto}
      `,
      paramsProduto
    );

    const produtos = [...produtosFacell, ...produtosFort];
    const imeiList = produtos.map((produto) => produto.imei);

    // * REEMBOLSOS PAGOS TIM
    const [reembolsosPagosTim] = await conn.execute(
      `
      SELECT imei, valor_reembolso, detalhamento_reembolso
      FROM tim_reembolsos
      WHERE imei IN (${imeiList.join(",")})
      AND (
        detalhamento_reembolso LIKE 'PRICE OFERTA' OR
        detalhamento_reembolso LIKE 'ADM' OR
        detalhamento_reembolso LIKE 'REBATE'
      )`
    );

    // Criar um Map para facilitar a busca de reembolsos por imei e detalhamento
    const reembolsoMap = new Map();
    reembolsosPagosTim.forEach((reembolso) => {
      let detalhe = reembolso.detalhamento_reembolso?.toUpperCase();
      if (detalhe === "PRICE OFERTA" || detalhe === "ADM") {
        detalhe = "PRICE OFERTA/ADM";
      }
      reembolsoMap.set(`${reembolso.imei}-${detalhe}`.toUpperCase(), reembolso);
    });

    // Filtrar e agrupar por imei
    const mapProdutosFiltrados = new Map();
    produtos
      .filter((produto) => {
        //^ DETALHE PRICE OFERTA NO LUGAR DO
        let detalhe = produto.detalhe_reembolso?.toUpperCase();
        if (detalhe === "PRICE OFERTA" || detalhe === "ADM") {
          detalhe = "PRICE OFERTA/ADM";
        }
        const keyProduto = `${produto.imei}-${detalhe}`.toUpperCase();

        const valorReembolso = reembolsoMap.get(keyProduto)?.valor_reembolso;
        const diferenca = Math.abs(produto.valor_reembolso || 0) - Math.abs(valorReembolso || 0);
        return (!reembolsoMap.get(keyProduto) && produto.valor_reembolso > 0) || diferenca >= 10;
      })
      .forEach((produto) => {
        let detalhe = produto.detalhe_reembolso?.toUpperCase();
        if (detalhe === "PRICE OFERTA" || detalhe === "ADM") {
          detalhe = "PRICE OFERTA/ADM";
        }
        const keyProduto = `${produto.imei}-${detalhe}`.toUpperCase();
        const valorReembolso = reembolsoMap.get(keyProduto)?.valor_reembolso || 0;
        const diferenca = Math.abs(produto.valor_reembolso) - Math.abs(valorReembolso);
        if (!mapProdutosFiltrados.has(produto.imei)) {
          mapProdutosFiltrados.set(produto.imei, { ...produto, valor_reembolso: diferenca });
        } else {
          const produtoAnterior = mapProdutosFiltrados.get(produto.imei);
          mapProdutosFiltrados.set(produto.imei, {
            ...produtoAnterior,
            observacao: produto.observacao || produtoAnterior.observacao,
            valor_reembolso: produtoAnterior.valor_reembolso + parseFloat(diferenca || 0),
          });
        }
      });
    const produtosReembolsoFiltrados = [...mapProdutosFiltrados.values()];

    //* APARELHOS PRICE
    const [aparelhosPriceFacell] = await conn.execute(
      `SELECT *,
       "PRODUTO" AS tipo,
       "APARELHO" AS datasys_categoria,
       "APARELHO PRICE" AS motivo,
       0 as compartilhado
      FROM facell_docs fd
      ${whereProdutoPrice}
      `,
      paramsProdutoPrice
    );
    const [aparelhosPriceFort] = await conn.execute(
      `SELECT *,
       "PRODUTO" AS tipo,
       "APARELHO" AS datasys_categoria,
       "APARELHO PRICE" AS motivo,
       0 as compartilhado
      FROM facell_docs_fort fd
      ${whereProdutoPrice}
      `,
      paramsProdutoPrice
    );

    const aparelhosPrice = [...aparelhosPriceFacell, ...aparelhosPriceFort];
    const imeiListPrice = aparelhosPrice.map((aparelho) => aparelho.imei);

    //* REEMBOLSOS PRICE
    const [timReembolsos] = await conn.execute(
      `
      SELECT imei, valor_reembolso
      FROM tim_reembolsos
      WHERE observacao LIKE '%BACK%OFERTA%'
      AND detalhamento_reembolso LIKE 'PRICE%BACK%'
      AND imei IN (${imeiListPrice.join(",")})`
    );

    // Criar um Map para associar imei -> valor_reembolso
    const reembolsoPriceMap = new Map(
      timReembolsos.map((reembolso) => [reembolso.imei, reembolso.valor_reembolso])
    );

    // Filtrar e unir os dados comuns entre aparelhosPrice e timReembolsos
    const aparelhosPriceFiltrados = aparelhosPrice
      .filter((aparelho) => reembolsoPriceMap.has(aparelho.imei)) // Filtra apenas os que estão no Map
      .map((aparelho) => ({
        ...aparelho,
        valor_reembolso: Math.abs(reembolsoPriceMap.get(aparelho.imei)) || null, // Adiciona valor_reembolso do Map
      }));

    //* DELETE PARA REPROCESSAMENTO
    await conn.execute(
      `
      DELETE vi FROM comissao_vendas_invalidas vi
      LEFT JOIN comissao_vendas_invalidas_contestacoes vic ON vic.id_venda_invalida = vi.id
      ${whereDelete}`,
      paramsDelete
    );

    const vendas_invalidas = [
      // INADIMPLÊNCIAS
      ...inadimplenciasFacell,
      ...inadimplenciasFort,
      // SERVIÇOS
      ...servicosFacell,
      ...servicosFort,
      // PRODUTOS
      ...produtosReembolsoFiltrados,
      // PRODUTOS PRICE
      ...aparelhosPriceFiltrados,
    ];

    const arrayVendas = [];
    const maxLength = 10000;

    let totalInseridos = 1;
    let totalVendas = vendas_invalidas.length;
    for (const venda of vendas_invalidas) {
      arrayVendas.push(`(
        ${db.escape(new Date(ano, mes - 1, 1))},      -- REF
        ${db.escape(venda.tipo)},                     -- TIPO
        ${db.escape(venda.filial)},                   -- FILIAL
        ${db.escape(venda.motivo)},                   -- MOTIVO
        ${db.escape(venda.datasys_categoria)},        -- SEGMENTO
        ${db.escape(venda.dtAtivacao)},               -- DATA VENDA
        ${db.escape(venda.pedido)},                   -- PEDIDO
        ${db.escape(venda.gsm)},                      -- GSM
        ${db.escape(venda.gsmProvisorio)},            -- GSM PROVISORIO
        ${db.escape(venda.imei)},                     -- IMEI
        ${db.escape(venda.aparelho)},                 -- APARELHO
        ${db.escape(venda.modalidade)},               -- MODALIDADE
        ${db.escape(venda.plano_ativado)},            -- PLANO
        ${db.escape(venda.cpf_cliente)},              -- CPF CLIENTE
        ${db.escape(venda.cpfVendedor)},              -- CPF VENDEDOR
        ${db.escape(Math.abs(venda.valor_receita))},  -- VALOR
        ${db.escape(venda.valor_reembolso)},          -- VALOR REEMBOLSO
        ${db.escape(venda.compartilhado)},            -- COMPARTILHADO
        ${db.escape(venda.observacao)}                -- OBSERVACAO
      )`);

      if (arrayVendas.length === maxLength || totalVendas === 1) {
        const queryInsert = `
        INSERT IGNORE INTO comissao_vendas_invalidas (
          ref,
          tipo,
          filial,
          motivo,
          segmento,
          data_venda,
          pedido,
          gsm,
          gsm_provisorio,
          imei,
          aparelho,
          modalidade,
          plano,
          cpf_cliente,
          cpf_vendedor,
          valor,
          estorno,
          compartilhado,
          observacao
        ) VALUES
          ${arrayVendas.join(",")}
        `;
        await conn.execute(queryInsert);
        arrayVendas.length = 0;
      }
      totalInseridos++;
      totalVendas--;
    }
    // await conn.rollback();
    const retorno = await rateioAutomaticoVendasInvalidas({
      body: {
        mes,
        ano,
        conn_externa: conn,
      },
    });
    await conn.commit();

    res.send(retorno);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "PROCESSAR_VENDAS_INVALIDAS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn && !conn_externa) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
