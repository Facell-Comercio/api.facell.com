const { format } = require("date-fns");
const { db } = require("../../../../mysql");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const {
  normalizeFirstAndLastName,
  normalizeCurrency,
} = require("../../../helpers/mask");
const { moverArquivoTempParaUploads } = require("../../files-controller");
const { addMonths } = require("date-fns/addMonths");
const { param } = require("../../../routes/financeiro/contas-pagar/titulos");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    var where = ` WHERE 1=1 `;
    // Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }
    // console.log(filters)
    const {
      id,
      id_grupo_economico,
      id_status,
      tipo_data,
      range_data,
      descricao,
      id_matriz,
      nome_fornecedor,
      nome_user,
    } = filters || {};

    const params = [];
    if (id) {
      where += ` AND t.id LIKE CONCAT(?,'%') `;
      params.push(id);
    }
    if (id_status && id_status !== "all") {
      where += ` AND t.id_status LIKE CONCAT(?,'%') `;
      params.push(id_status);
    }
    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND t.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND t.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND t.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    // console.log(where)

    try {
      const [rowsTitulos] = await db.execute(
        `SELECT count(t.id) as total 
        FROM fin_cp_titulos t 
        LEFT JOIN filiais f ON f.id = t.id_filial ${where}`,
        params
      );
      const totalTitulos = (rowsTitulos && rowsTitulos[0]["total"]) || 0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      var query = `
            SELECT 
                t.id, s.status, t.created_at, t.data_prevista, t.descricao, t.valor,
                f.nome as filial, f.id_matriz,
                forn.nome as fornecedor, u.nome as solicitante
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante

            ${where}

            ORDER BY 
                t.created_at DESC 
            ${limit}`;
      params.push(pageSize);
      params.push(offset);
      console.log(query);
      console.log(params);
      const [titulos] = await db.execute(query, params);

      const objResponse = {
        rows: titulos,
        pageCount: Math.ceil(totalTitulos / pageSize),
        rowCount: totalTitulos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      console.log("ERRO TITULOS PAGAR GET_ALL", error);
      reject(error);
    }
  });
}

function getAllCpTitulosBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    var where = ` WHERE 1=1 `;
    // Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }
    // console.log(filters)
    const {
      id,
      id_grupo_economico,
      tipo_data,
      fornecedor,
      range_data,
      descricao,
      id_matriz,
      id_filial,
      id_conta_bancaria,
      termo,
    } = filters || {};

    // console.log(filters);
    const params = [];
    if (termo) {
      where += ` AND (
        t.id LIKE CONCAT(?,'%') 
        OR t.descricao LIKE CONCAT('%',?,'%')
        OR forn.nome LIKE CONCAT('%',?,'%')
        OR t.num_doc LIKE CONCAT('%',?,'%')
        OR t.valor LIKE CONCAT('%',?,'%')
        OR f.nome LIKE CONCAT('%',?,'%')  
    )  `;
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
    }
    if (id) {
      where += ` AND t.id LIKE CONCAT(?,'%') `;
      params.push(id);
    }
    if (descricao) {
      where += ` t.descricao LIKE CONCAT('%',?,'%')  `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (id_filial) {
      where += ` AND f.id = ? `;
      params.push(id_filial);
    }
    if (fornecedor) {
      where += ` AND forn.nome LIKE CONCAT('%',?,'%') `;
      params.push(fornecedor);
    }

    where += ` 
    AND t.id_status = 3 
      AND tb.id_titulo IS NULL `;

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND t.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND t.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND t.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    // console.log(where)

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT DISTINCT 
          t.id as id_titulo, s.status, t.created_at, t.data_vencimento, t.descricao, t.valor,
          f.nome as filial, f.id_matriz,
          forn.nome as fornecedor, u.nome as solicitante
          FROM fin_cp_titulos t 
          LEFT JOIN fin_cp_status s ON s.id = t.id_status 
          LEFT JOIN filiais f ON f.id = t.id_filial 
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN users u ON u.id = t.id_solicitante
          LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_titulo = t.id

          ${where}
        ) AS subconsulta
        `,
        params
      );
      const totalTitulos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      var query = `
            SELECT DISTINCT 
                t.id as id_titulo, s.status, t.data_prevista as previsao, 
                t.descricao, t.valor as valor_total,
                f.nome as filial, f.id_matriz,
                forn.nome as nome_fornecedor, t.num_doc, t.data_pagamento
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_titulo = t.id

            ${where}

            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      // console.log(query);
      // console.log(params);
      const [titulos] = await db.execute(query, params);

      const objResponse = {
        rows: titulos,
        pageCount: Math.ceil(totalTitulos / pageSize),
        rowCount: totalTitulos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      console.log("ERRO TITULOS PAGAR GET_ALL_CP_TITULOS_BORDERO", error);
      reject(error);
    }
  });
}

function getAllRecorrencias(req) {
  return new Promise(async (resolve, reject) => {
    try {
      const { user } = req;
      const { filters } = req.query || {};
      const { mes, ano } = filters || {};
      const params = [];
      let where = "WHERE 1=1 ";

      if (
        !checkUserPermission(req, "MASTER") &&
        !checkUserDepartment(req, "FINANCEIRO")
      ) {
        const centro_custo = user?.centros_custo
          ?.map((centro) => centro.id)
          .join(",");
        where += ` AND r.id_centro_custo IN(${centro_custo})`;
      }
      where += `AND YEAR(r.data_vencimento) = ?
        AND MONTH(r.data_vencimento) = ?`;
      params.push(ano);
      params.push(mes);
      // fornecedor, filial, data-vencimento, valor, descricao, centro-custo, grupo-economico, criador (usuario)

      console.log(
        `SELECT 
      r.id_titulo, r.data_vencimento,
      t.descricao, t.valor,
      forn.nome as fornecedor,
      f.nome as filial, f.id_matriz,
      cc.nome as centro_custo,
      ge.nome as grupo_economico,
      u.nome as criador,
      CASE WHEN r.data_vencimento = t.data_vencimento AND r.id_titulo = t.id THEN true ELSE false END as lancado
    FROM fin_cp_titulos_recorrencias r 
    LEFT JOIN fin_cp_titulos t ON t.id = r.id_titulo
    LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
    LEFT JOIN filiais f ON f.id = t.id_filial
    LEFT JOIN fin_centros_custo cc ON cc.id = t.id_centro_custo
    LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
    LEFT JOIN users u ON u.id = r.id_user
    ${where}
    `,
        params
      );

      const [recorrencias] = await db.execute(
        `SELECT 
          r.*,
          t.descricao, t.valor,
          forn.nome as fornecedor,
          f.nome as filial, f.id_matriz,
          cc.nome as centro_custo,
          ge.nome as grupo_economico,
          u.nome as criador
        FROM fin_cp_titulos_recorrencias r 
        LEFT JOIN fin_cp_titulos t ON t.id = r.id_titulo
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_centros_custo cc ON cc.id = t.id_centro_custo
        LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
        LEFT JOIN users u ON u.id = r.id_user
        ${where}
        `,
        params
      );
      resolve({ rows: recorrencias });
    } catch (error) {
      console.log("ERROR_GET_ALL_RECORRENCIAS", error);
      reject(error);
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    // console.log(req.params)
    try {
      const [rowTitulo] = await db.execute(
        `
        SELECT t.*, st.status,
                f.id_grupo_economico,
                f.id_matriz,
                fb.nome as banco,
                fb.codigo as codigo_banco,
                fo.nome as nome_fornecedor, 
                fo.cnpj as cnpj_fornecedor,
                fcc.nome as centro_custo,
                fr.manual as rateio_manual

            FROM fin_cp_titulos t 
            INNER JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN fin_bancos fb ON fb.id = t.id_banco
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN 
                fin_fornecedores fo ON fo.id = t.id_fornecedor
            LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
            LEFT JOIN fin_centros_custo fcc ON fcc.id = t.id_centro_custo
            WHERE t.id = ?
            `,
        [id]
      );

      const [itens] = await db.execute(
        `SELECT fcpti.*, CONCAT(fpc.codigo, ' - ',fpc.descricao) as plano_conta 
        FROM fin_cp_titulos_itens fcpti 
        LEFT JOIN fin_plano_contas fpc ON fpc.id = fcpti.id_plano_conta
        WHERE fcpti.id_titulo = ? 
        
        `,
        [id]
      );

      const [itens_rateio] = await db.execute(
        `SELECT fcpt.id_filial, FORMAT(fcpt.percentual * 100, 2) as percentual FROM fin_cp_titulos_rateio fcpt WHERE fcpt.id_titulo = ?`,
        [id]
      );

      const [historico] = await db.execute(
        `SELECT * FROM fin_cp_titulos_historico WHERE id_titulo = ? ORDER BY created_at DESC`,
        [id]
      );

      const titulo = rowTitulo && rowTitulo[0];
      // console.log(titulo)
      const objResponse = { titulo, itens, itens_rateio, historico };
      console.log(objResponse);
      resolve(objResponse);
      return;
    } catch (error) {
      console.log("ERROR_GET_ONE_TITULO_PAGAR", error);
      reject(error);
      return;
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { user } = req;
      const data = req.body;
      const {
        id_filial,
        id_recorrencia,
        id_grupo_economico,

        id_fornecedor,
        id_forma_pagamento,
        favorecido,
        cnpj_favorecido,
        id_tipo_chave_pix,
        chave_pix,

        id_banco,

        agencia,
        dv_agencia,
        id_tipo_conta,
        conta,
        dv_conta,

        // Geral
        id_centro_custo,
        centro_custo,
        data_emissao,
        data_vencimento,
        data_prevista,
        num_parcelas,
        parcela,

        num_doc,
        valor,

        id_tipo_solicitacao,
        descricao,

        itens,

        id_rateio,
        itens_rateio,

        url_nota_fiscal,
        url_xml,
        url_boleto,
        url_contrato,
        url_planilha,
        url_txt,
      } = data || {};

      // console.log('NOVOS_DADOS', novos_dados)
      // console.log(`TITULO ${data.id}: ITENS: `,itens)
      // console.log(`TITULO ${data.id}: ITENS_RATEIO: `,itens_rateio)

      // ^ Validações
      // Titulo
      if (!id_filial) {
        throw new Error("Campo id_filial não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("Campo id_grupo_economico não informado!");
      }
      if (!id_fornecedor) {
        throw new Error("Campo id_fornecedor não informado!");
      }
      if (!id_forma_pagamento) {
        throw new Error("Campo id_forma_pagamento não informado!");
      }
      if (!id_centro_custo) {
        throw new Error("Campo id_centro_custo não informado!");
      }
      if (!descricao) {
        throw new Error("Campo Descrição não informado!");
      }
      if (!data_vencimento) {
        throw new Error("Campo data_vencimento não informado!");
      }
      if (!data_emissao) {
        throw new Error("Campo data_emissao não informado!");
      }
      if (!data_prevista) {
        throw new Error("Campo data_prevista não informado!");
      }

      // Se for PIX: Exigir id_tipo_chave_pix e chave_pix
      if (id_forma_pagamento === "4") {
        if (!id_tipo_chave_pix || !chave_pix) {
          throw new Error(
            "Selecionado forma de pagamento PIX mas não informado tipo chave ou chave PIX"
          );
        }
      }
      // Se forma de pagamento for na conta, então exigir os dados bancários
      if (
        id_forma_pagamento === "2" ||
        id_forma_pagamento === "5" ||
        id_forma_pagamento === "8"
      ) {
        if (!id_banco || !id_tipo_conta || !agencia || !conta) {
          throw new Error("Preencha corretamente os dádos bancários!");
        }
      }

      // Se tipo solicitação for Com nota, exigir anexos
      if (id_tipo_solicitacao === "1") {
        if (!url_nota_fiscal) {
          throw new Error("Faça o upload da Nota Fiscal!");
        }
      } else {
        if (!url_contrato) {
          throw new Error("Faça o upload do Contrato/Autorização!");
        }
      }

      // Itens
      if (!itens || itens.length === 0) {
        throw new Error("Campo itens não informado!");
      }

      // Esquema de rateio
      if (!itens_rateio || itens_rateio.length === 0) {
        throw new Error("Campo itens_rateio não informado!");
      }

      // Obter o Orçamento:
      const [rowOrcamento] = await conn.execute(
        `SELECT id FROM fin_orcamento WHERE DATE_FORMAT(ref, '%Y-%m') = ? and id_grupo_economico = ?`,
        [format(new Date(), "yyyy-MM"), id_grupo_economico]
      );

      if (!rowOrcamento || rowOrcamento.length === 0) {
        throw new Error("Orçamento não localizado!");
      }
      if (rowOrcamento.length > 1) {
        throw new Error(
          `${rowOrcamento.length} orçamentos foram localizados, isso é um erro! Procurar a equipe de desenvolvimento.`
        );
      }
      const id_orcamento =
        rowOrcamento && rowOrcamento[0] && rowOrcamento[0]["id"];

      if (!id_orcamento) {
        throw new Error("Orçamento não localizado!");
      }

      // Passamos por cada item novo, validando campos e analisando o orçamento
      for (const item of itens) {
        // ^ Validar item se possui todos os campos obrigatórios
        if (!item.id_plano_conta) {
          throw new Error(
            `O item não possui plano de contas selecionado! Item: ${JSON.stringify(
              item
            )}`
          );
        }
        if (!item.valor) {
          throw new Error(
            `O item não possui valor! Item: ${JSON.stringify(item)}`
          );
        }

        // ^ Vamos validar se orçamento possui saldo:
        // Obter a Conta de Orçamento com o Valor Previsto:
        const [rowOrcamentoConta] = await conn.execute(
          `SELECT id, valor_previsto FROM fin_orcamento_contas 
          WHERE 
            id_orcamento = ?
            AND id_centro_custo = ?
            AND id_plano_contas = ?
            `,
          [id_orcamento, id_centro_custo, item.id_plano_conta]
        );

        if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
          throw new Error(
            `Não existe conta no orçamento para o seu Centro de custos + Plano de contas ${item.plano_conta}!`
          );
        }
        const id_orcamento_conta =
          rowOrcamentoConta &&
          rowOrcamentoConta[0] &&
          rowOrcamentoConta[0]["id"];
        let valor_previsto =
          rowOrcamentoConta &&
          rowOrcamentoConta[0] &&
          rowOrcamentoConta[0]["valor_previsto"];
        valor_previsto = parseFloat(valor_previsto);

        // Obter o Valor Realizado da Conta do Orçamento:
        const [rowConsumoOrcamento] = await conn.execute(
          `SELECT sum(valor) as valor 
          FROM fin_orcamento_consumo 
          WHERE active = true AND id_orcamento_conta = ?`,
          [id_orcamento_conta]
        );
        let valor_total_consumo =
          (rowConsumoOrcamento &&
            rowConsumoOrcamento[0] &&
            rowConsumoOrcamento[0]["valor"]) ||
          0;
        valor_total_consumo = parseFloat(valor_total_consumo);

        // Calcular o saldo da conta do orçamento:
        const saldo = valor_previsto - valor_total_consumo;
        if (saldo < item.valor) {
          throw new Error(
            `Saldo insuficiente para o seu Centro de Custos + Plano de contas: ${
              item.plano_conta
            }. Necessário ${normalizeCurrency(item.valor - saldo)}`
          );
        }
      }

      // Persitir os anexos
      const nova_url_nota_fiscal = await moverArquivoTempParaUploads(
        url_nota_fiscal
      );
      const nova_url_xml = await moverArquivoTempParaUploads(url_xml);
      const nova_url_boleto = await moverArquivoTempParaUploads(url_boleto);
      const nova_url_contrato = await moverArquivoTempParaUploads(url_contrato);
      const nova_url_planilha = await moverArquivoTempParaUploads(url_planilha);
      const nova_url_txt = await moverArquivoTempParaUploads(url_txt);

      // * Criação do Título a Pagar
      const [resultInsertTitulo] = await conn.execute(
        `INSERT INTO fin_cp_titulos 
        (
          id_solicitante,
          id_fornecedor,
          id_banco,
          id_forma_pagamento,

          agencia,
          dv_agencia,
          id_tipo_conta,
          conta,
          dv_conta,
          favorecido,
          cnpj_favorecido,

          id_tipo_chave_pix,
          chave_pix,

          id_tipo_solicitacao,
          id_filial,
          id_centro_custo,
          num_parcelas,
          parcela,
          
          data_emissao,
          data_vencimento,
          data_prevista,
          num_doc,
          valor,
          descricao,
          
          id_rateio,

          url_nota_fiscal,
          url_xml,
          url_boleto,
          url_contrato,
          url_planilha,
          url_txt
        )

          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
          user.id,
          id_fornecedor,
          id_banco,
          id_forma_pagamento,

          agencia,
          dv_agencia,
          id_tipo_conta,
          conta,
          dv_conta,
          favorecido,
          cnpj_favorecido,

          id_tipo_chave_pix,
          chave_pix,

          id_tipo_solicitacao,
          id_filial,
          id_centro_custo,

          num_parcelas,
          parcela,

          data_emissao,
          data_vencimento,
          data_prevista,
          num_doc,
          valor,
          descricao,

          id_rateio,

          nova_url_nota_fiscal,
          nova_url_xml,
          nova_url_boleto,
          nova_url_contrato,
          nova_url_planilha,
          nova_url_txt,
        ]
      );

      const newId = resultInsertTitulo.insertId;
      // ~ Fim da criação do Título ////////////

      // * Atualizar recorrência
      if (id_recorrencia) {
        await conn.execute(
          `UPDATE fin_cp_titulos_recorrencias SET lancado = true WHERE id =?`,
          [id_recorrencia]
        );
      }

      // * Persistir Esquema de rateio
      for (const item_rateio of itens_rateio) {
        await conn.execute(
          `INSERT INTO fin_cp_titulos_rateio (id_titulo, id_rateio, id_filial, percentual) VALUES (?,?,?,?)`,
          [newId, id_rateio, item_rateio.id_filial, item_rateio.percentual]
        );
      }

      // * Salvar os novos itens
      for (const item of itens) {
        // * Persistir o item do titulo e obter o id:
        const [resultNewItem] = await conn.execute(
          `INSERT INTO fin_cp_titulos_itens (id_titulo, id_plano_conta, valor) VALUES (?,?,?)`,
          [newId, item.id_plano_conta, item.valor]
        );

        // Obter o id_orcamento_conta
        const [rowOrcamentoConta] = await conn.execute(
          `SELECT id, valor_previsto FROM fin_orcamento_contas 
          WHERE 
            id_orcamento = ?
            AND id_centro_custo = ?
            AND id_plano_contas = ?
            `,
          [id_orcamento, id_centro_custo, item.id_plano_conta]
        );

        if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
          throw new Error(
            `Não existe conta no orçamento para o seu Centro de custos + Plano de contas ${item.plano_conta}!`
          );
        }
        const id_orcamento_conta =
          rowOrcamentoConta &&
          rowOrcamentoConta[0] &&
          rowOrcamentoConta[0]["id"];

        // * Persistir a conta de consumo do orçamento:
        await conn.execute(
          `INSERT INTO fin_orcamento_consumo (id_orcamento_conta, id_titulo_item, valor) VALUES (?,?,?)`,
          [id_orcamento_conta, resultNewItem.insertId, item.valor]
        );
      }

      //~ Fim de manipulação de itens //////////////////////

      // Persistir os itens do rateio
      const [itens_no_banco] = await conn.execute(
        `SELECT * FROM fin_cp_titulos_itens WHERE id_titulo = ?`,
        [newId]
      );
      for (const item of itens_no_banco) {
        // * Persistir o rateio dos itens
        for (const item_rateio of itens_rateio) {
          const valor_rateado = item_rateio.percentual * item.valor;
          console.log(item_rateio.percentual, item.valor, valor_rateado);
          await conn.execute(
            `INSERT INTO fin_cp_titulos_rateio_itens (id_titulo, id_titulo_item, id_rateio, id_filial, percentual, valor) VALUES (?,?,?,?,?,?)`,
            [
              newId,
              item.id,
              id_rateio,
              item_rateio.id_filial,
              item_rateio.percentual,
              valor_rateado,
            ]
          );
        }
      }

      // Gerar e Registar historico:
      let historico = `CRIADO POR: ${normalizeFirstAndLastName(user.nome)}.\n`;

      await conn.execute(
        `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [newId, historico]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERROR_INSERT_ONE_TITULO_PAGAR", error);
      await conn.rollback();
      reject(error);
    } finally {
      await conn.release();
    }
  });
}

function insertOneRecorrencia(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { user } = req;
      const data = req.body;
      const { id, data_vencimento } = data || {};

      // ~ Criação da data do mês seguinte
      const new_data_vencimento = addMonths(data_vencimento, 1);
      console.log(new_data_vencimento);

      // ^ Validações
      // Titulo
      if (!id) {
        throw new Error("Campo id não informado!");
      }

      const [rowsExistentes] = await conn.execute(
        `SELECT id FROM fin_cp_titulos_recorrencias WHERE id_titulo = ? AND data_vencimento = ?`,
        [id, new Date(new_data_vencimento)]
      );
      if (rowsExistentes && rowsExistentes.length > 0) {
        throw new Error("Recorrência já criada com base nesse título!");
      }
      if (!data_vencimento) {
        throw new Error("Campo data_vencimento não informado!");
      }

      // * Criação da Recorrência
      await conn.execute(
        `INSERT INTO fin_cp_titulos_recorrencias 
        (
          id_titulo,
          data_vencimento,
          id_user
        )
          VALUES (?,?,?)
        `,
        [id, new Date(new_data_vencimento), user.id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERROR_INSERT_ONE_RECORRÊNCIA_PGTO", error);
      await conn.rollback();
      reject(error);
    } finally {
      await conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();

    try {
      const { user } = req;

      await conn.beginTransaction();
      const data = req.body;
      const {
        id,
        id_filial,
        id_grupo_economico,

        id_fornecedor,
        id_forma_pagamento,
        favorecido,
        cnpj_favorecido,
        id_tipo_chave_pix,
        chave_pix,

        id_banco,

        agencia,
        dv_agencia,
        id_tipo_conta,
        conta,
        dv_conta,

        // Geral
        id_centro_custo,
        centro_custo,
        data_emissao,
        data_vencimento,
        data_prevista,
        num_parcelas,
        parcela,

        num_doc,
        valor,

        id_tipo_solicitacao,
        descricao,

        update_itens,
        itens,

        update_rateio,
        id_rateio,
        itens_rateio,

        url_nota_fiscal,
        url_xml,
        url_boleto,
        url_contrato,
        url_planilha,
        url_txt,
      } = data || {};

      // console.log('NOVOS_DADOS', novos_dados)
      // console.log(`TITULO ${data.id}: ITENS: `,itens)
      // console.log(`TITULO ${data.id}: ITENS_RATEIO: `,itens_rateio)

      // ^ Validações
      // Titulo
      if (!id) {
        throw new Error("ID do título não informado!");
      }
      if (!id_filial) {
        throw new Error("Campo id_filial não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("Campo id_grupo_economico não informado!");
      }
      if (!id_fornecedor) {
        throw new Error("Campo id_fornecedor não informado!");
      }
      if (!id_forma_pagamento) {
        throw new Error("Campo id_forma_pagamento não informado!");
      }
      if (!id_centro_custo) {
        throw new Error("Campo id_centro_custo não informado!");
      }
      if (!descricao) {
        throw new Error("Campo Descrição não informado!");
      }
      if (!data_vencimento) {
        throw new Error("Campo data_vencimento não informado!");
      }
      if (!data_emissao) {
        throw new Error("Campo data_emissao não informado!");
      }
      if (!data_prevista) {
        throw new Error("Campo data_prevista não informado!");
      }

      // Se for PIX: Exigir id_tipo_chave_pix e chave_pix
      if (id_forma_pagamento === "4") {
        if (!id_tipo_chave_pix || !chave_pix) {
          throw new Error(
            "Selecionado forma de pagamento PIX mas não informado tipo chave ou chave PIX"
          );
        }
      }
      // Se forma de pagamento for na conta, então exigir os dados bancários
      if (
        id_forma_pagamento === "2" ||
        id_forma_pagamento === "5" ||
        id_forma_pagamento === "8"
      ) {
        if (!id_banco || !id_tipo_conta || !agencia || !conta) {
          throw new Error("Preencha corretamente os dádos bancários!");
        }
      }

      // Se tipo solicitação for Com nota, exigir anexos
      if (id_tipo_solicitacao === "1") {
        if (!url_nota_fiscal) {
          throw new Error("Faça o upload da Nota Fiscal!");
        }
      } else {
        if (!url_contrato) {
          throw new Error("Faça o upload do Contrato/Autorização!");
        }
      }

      // Itens
      if (!itens || itens.length === 0) {
        throw new Error("Campo itens não informado!");
      }

      // Esquema de rateio
      if (!itens_rateio || itens_rateio.length === 0) {
        throw new Error("Campo itens_rateio não informado!");
      }

      // Obter dados do Titulo no banco:
      const [rowTitulo] = await conn.execute(
        `SELECT * FROM fin_cp_titulos WHERE id = ?`,
        [id]
      );
      const titulo = rowTitulo && rowTitulo[0];
      if (!titulo) throw new Error("Título não localizado!");

      // Obter os Itens anteriores para registra-los no histórico caso precise
      const [itens_anteriores] = await conn.execute(
        `SELECT ti.valor, CONCAT(pc.codigo, ' - ', pc.descricao) as plano_conta
        FROM fin_cp_titulos_itens ti
        INNER JOIN fin_plano_contas pc ON pc.id = ti.id_plano_conta
        WHERE ti.id_titulo = ?`,
        [titulo.id]
      );

      // Obter o Orçamento:
      const [rowOrcamento] = await conn.execute(
        `SELECT id FROM fin_orcamento WHERE DATE_FORMAT(ref, '%Y-%m') = ? and id_grupo_economico = ?`,
        [format(titulo.created_at, "yyyy-MM"), id_grupo_economico]
      );

      if (!rowOrcamento || rowOrcamento.length === 0) {
        throw new Error("Orçamento não localizado!");
      }
      if (rowOrcamento.length > 1) {
        throw new Error(
          `${rowOrcamento.length} orçamentos foram localizados, isso é um erro! Procurar a equipe de desenvolvimento.`
        );
      }
      const id_orcamento =
        rowOrcamento && rowOrcamento[0] && rowOrcamento[0]["id"];

      // ~ Início de Manipulação de Rateio //////////////////////
      if (update_rateio) {
        // ! Excluir Antigo Esquema de rateio
        await conn.execute(
          `DELETE FROM fin_cp_titulos_rateio WHERE id_titulo = ?`,
          [id]
        );

        // Salvar Esquema de rateio
        for (const item_rateio of itens_rateio) {
          await conn.execute(
            `INSERT INTO fin_cp_titulos_rateio (id_titulo, id_rateio, id_filial, percentual) VALUES (?,?,?,?)`,
            [id, id_rateio, item_rateio.id_filial, item_rateio.percentual]
          );
        }
      }
      if (update_rateio || update_itens) {
        // ! Excluir Antigos Itens Rateados
        await conn.execute(
          `DELETE FROM fin_cp_titulos_rateio_itens WHERE id_titulo = ?`,
          [id]
        );
        // Vamos ratear e salvar os itens lá nos itens
      }
      // ~ Fim de Manipulação de Rateio //////////////////////

      //~ Início de manipulação de itens - caso update_itens = true //////////////////////
      if (update_itens) {
        if (!id_orcamento) {
          throw new Error("Orçamento não localizado!");
        }

        // Passamos por cada item novo, validando campos e analisando o orçamento
        for (const item of itens) {
          // ^ Validar item se possui todos os campos obrigatórios
          if (!item.id_plano_conta) {
            throw new Error(
              `O item não possui plano de contas selecionado! Item: ${JSON.stringify(
                item
              )}`
            );
          }
          if (!item.valor) {
            throw new Error(
              `O item não possui valor! Item: ${JSON.stringify(item)}`
            );
          }

          // ^ Vamos validar se orçamento possui saldo:
          // Obter o registro de consumo anterior - para poder agregar no saldo atual do orçamento:
          const [rowConsumoTitulo] = await conn.execute(
            `SELECT sum(foc.valor) as valor 
            FROM fin_orcamento_consumo foc
            WHERE foc.active = true AND foc.id_titulo_item IN (
              SELECT ti.id
              FROM fin_cp_titulos_itens ti
              WHERE ti.id_titulo = ? AND ti.id_plano_conta = ?
            )
            GROUP BY foc.id
          `,
            [id, item.id_plano_conta]
          );

          let valorConsumidoPeloItemAnterior =
            (rowConsumoTitulo &&
              rowConsumoTitulo[0] &&
              rowConsumoTitulo[0]["valor"]) ||
            0;
          valorConsumidoPeloItemAnterior = parseFloat(
            valorConsumidoPeloItemAnterior
          );

          // Obter a Conta de Orçamento com o Valor Previsto:
          const [rowOrcamentoConta] = await conn.execute(
            `SELECT id, valor_previsto FROM fin_orcamento_contas 
          WHERE 
            id_orcamento = ?
            AND id_centro_custo = ?
            AND id_plano_contas = ?
            `,
            [id_orcamento, id_centro_custo, item.id_plano_conta]
          );

          if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
            throw new Error(
              `Não existe conta no orçamento para o seu Centro de custos + Plano de contas ${item.plano_conta}!`
            );
          }
          const id_orcamento_conta =
            rowOrcamentoConta &&
            rowOrcamentoConta[0] &&
            rowOrcamentoConta[0]["id"];
          let valor_previsto =
            rowOrcamentoConta &&
            rowOrcamentoConta[0] &&
            rowOrcamentoConta[0]["valor_previsto"];
          valor_previsto = parseFloat(valor_previsto);

          // Obter o Valor Realizado da Conta do Orçamento:
          const [rowConsumoOrcamento] = await conn.execute(
            `SELECT sum(valor) as valor 
          FROM fin_orcamento_consumo 
          WHERE active = true AND id_orcamento_conta = ?`,
            [id_orcamento_conta]
          );
          let valor_total_consumo =
            (rowConsumoOrcamento &&
              rowConsumoOrcamento[0] &&
              rowConsumoOrcamento[0]["valor"]) ||
            0;
          valor_total_consumo = parseFloat(valor_total_consumo);

          // Calcular o saldo da conta do orçamento:
          const saldo =
            valor_previsto -
            valor_total_consumo +
            valorConsumidoPeloItemAnterior;
          if (saldo < item.valor) {
            throw new Error(
              `Saldo insuficiente para o seu Centro de Custos + Plano de contas: ${
                item.plano_conta
              }. Necessário ${normalizeCurrency(item.valor - saldo)}`
            );
          }
        }

        // ! Excluir todos os itens antigos do titulo
        await conn.execute(
          `DELETE FROM fin_cp_titulos_itens WHERE id_titulo = ?`,
          [id]
        );

        // ! Excluir todas as contas de consumo do orçamento anteriores
        await conn.execute(
          `DELETE FROM fin_orcamento_consumo 
        WHERE id_titulo_item IN (
          SELECT id FROM fin_cp_titulos_itens WHERE id_titulo = ?
        )`,
          [id]
        );

        // * Salvar os novos itens
        for (const item of itens) {
          // * Persistir o item do titulo e obter o id:
          const [result] = await conn.execute(
            `INSERT INTO fin_cp_titulos_itens (id_titulo, id_plano_conta, valor) VALUES (?,?,?)`,
            [id, item.id_plano_conta, item.valor]
          );

          // Obter o id_orcamento_conta
          const [rowOrcamentoConta] = await conn.execute(
            `SELECT id, valor_previsto FROM fin_orcamento_contas 
          WHERE 
            id_orcamento = ?
            AND id_centro_custo = ?
            AND id_plano_contas = ?
            `,
            [id_orcamento, id_centro_custo, item.id_plano_conta]
          );

          if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
            throw new Error(
              `Não existe conta no orçamento para o seu Centro de custos + Plano de contas ${item.plano_conta}!`
            );
          }
          const id_orcamento_conta =
            rowOrcamentoConta &&
            rowOrcamentoConta[0] &&
            rowOrcamentoConta[0]["id"];

          // * Persistir a conta de consumo do orçamento:
          await conn.execute(
            `INSERT INTO fin_orcamento_consumo (id_orcamento_conta, id_titulo_item, valor) VALUES (?,?,?)`,
            [id_orcamento_conta, result.insertId, item.valor]
          );
        }
      }
      //~ Fim de manipulação de itens //////////////////////

      if (update_itens || update_rateio) {
        // Persistir os itens do rateio
        const [itens_no_banco] = await conn.execute(
          `SELECT * FROM fin_cp_titulos_itens WHERE id_titulo = ?`,
          [id]
        );
        for (const item of itens_no_banco) {
          // * Persistir o rateio dos itens
          for (const item_rateio of itens_rateio) {
            const valor_rateado = item_rateio.percentual * item.valor;
            console.log(item_rateio.percentual, item.valor, valor_rateado);
            await conn.execute(
              `INSERT INTO fin_cp_titulos_rateio_itens (id_titulo, id_titulo_item, id_rateio, id_filial, percentual, valor) VALUES (?,?,?,?,?,?)`,
              [
                id,
                item.id,
                id_rateio,
                item_rateio.id_filial,
                item_rateio.percentual,
                valor_rateado,
              ]
            );
          }
        }
      }

      // Persitir os anexos
      const nova_url_nota_fiscal = await moverArquivoTempParaUploads(
        url_nota_fiscal
      );
      const nova_url_xml = await moverArquivoTempParaUploads(url_xml);
      const nova_url_boleto = await moverArquivoTempParaUploads(url_boleto);
      const nova_url_contrato = await moverArquivoTempParaUploads(url_contrato);
      const nova_url_planilha = await moverArquivoTempParaUploads(url_planilha);
      const nova_url_txt = await moverArquivoTempParaUploads(url_txt);

      // Persistir  novos dados do Titulo
      await conn.execute(
        `UPDATE fin_cp_titulos 
      SET
        id_fornecedor = ?,
        id_banco = ?,
        id_forma_pagamento = ?,

        agencia = ?,
        dv_agencia = ?,
        id_tipo_conta = ?,
        conta = ?,
        dv_conta = ?,
        favorecido = ?,
        cnpj_favorecido = ?,

        id_tipo_chave_pix = ?,
        chave_pix = ?,

        id_tipo_solicitacao = ?,
        id_filial = ?,
        id_centro_custo = ?,
        num_parcelas = ?,
        parcela = ?,
        
        data_emissao = ?,
        data_vencimento = ?,
        data_prevista = ?,
        num_doc = ?,
        valor = ?,
        descricao = ?,
        
        id_rateio = ?,

        url_nota_fiscal = ?,
        url_xml = ?,
        url_boleto = ?,
        url_contrato = ?,
        url_planilha = ?,
        url_txt = ?,

        updated_at = current_timestamp()

      WHERE id = ?
      `,
        [
          id_fornecedor,
          id_banco,
          id_forma_pagamento,

          agencia,
          dv_agencia,
          id_tipo_conta,
          conta,
          dv_conta,
          favorecido,
          cnpj_favorecido,

          id_tipo_chave_pix,
          chave_pix,

          id_tipo_solicitacao,
          id_filial,
          id_centro_custo,

          num_parcelas,
          parcela,

          data_emissao,
          data_vencimento,
          data_prevista,
          num_doc,
          valor,
          descricao,

          id_rateio,

          nova_url_nota_fiscal,
          nova_url_xml,
          nova_url_boleto,
          nova_url_contrato,
          nova_url_planilha,
          nova_url_txt,

          // ID do título ao final!
          id,
        ]
      );

      // Gerar e Registar historico:
      let historico = `EDITADO POR: ${normalizeFirstAndLastName(user.nome)}.\n`;
      if (data_vencimento != titulo.data_vencimento) {
        historico += `VENCIMENTO: DE: ${format(
          titulo.data_vencimento,
          "dd/MM/yyyy"
        )} PARA: ${format(data_vencimento, "dd/MM/yyyy")}\n`;
      }
      if (valor != titulo.valor) {
        historico += `VALOR: DE: ${normalizeCurrency(
          titulo.valor
        )} PARA: ${normalizeCurrency(valor)}\n`;
      }
      if (descricao != titulo.descricao) {
        historico += `DESCRICAO:\n \t DE: '${titulo.descricao}'\n \tPARA: '${descricao}'\n`;
      }
      if (id_centro_custo != titulo.id_centro_custo) {
        historico += `CENTRO DE CUSTO:\n \tDE: '${titulo.centro_custo}'\n \tPARA: '${centro_custo}'\n`;
      }

      if (update_itens) {
        historico += `ITENS ANTERIORES:\n `;
        itens_anteriores.forEach((item_anterior, index) => {
          historico += `\t ITEM ${index + 1}: \n`;
          historico += `\t PLANO DE CONTAS: '${item_anterior.plano_conta}' \n`;
          historico += `\t VALOR: '${normalizeCurrency(
            item_anterior.valor
          )}' \n`;
        });
      }

      await conn.execute(
        `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [id, historico]
      );

      await conn.commit();
      resolve();
    } catch (error) {
      console.log("ERROR_TITULO_PAGAR_UPDATE", error);
      await conn.rollback();
      reject(error);
    } finally {
      await conn.release();
    }
  });
}

function updateFileTitulo(req) {
  return new Promise(async (resolve, reject) => {
    const { id, fileUrl, campo } = req.body;
    try {
      if (!id) {
        resolve({ message: "Sucesso!" });
      }
      // Lista de campos válidos
      const camposValidos = [
        "url_xml",
        "url_nota_fiscal",
        "url_boleto",
        "url_contrato",
        "url_planilha",
        "url_txt",
      ]; // Adicione mais campos conforme necessário

      // Verificar se o nome do campo é válido
      if (!camposValidos.includes(campo)) {
        throw new Error(
          "Envie um campo válido; url_xml, url_nota_fiscal, url_boleto, url_contrato, url_planilha, url_txt"
        );
      }

      await db.execute(`UPDATE fin_cp_titulos SET ${campo} = ? WHERE id = ? `, [
        fileUrl,
        id,
      ]);

      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      reject(error);
      return;
    }
  });
}

function changeStatusTitulo(req) {
  return new Promise(async (resolve, reject) => {
    const { id_titulo, id_novo_status, motivo } = req.body;
    const user = req.user;
    // console.log("REQ.BODY", req.body);

    const tipos_status = [
      { id: "1", status: "Solicitado" },
      { id: "2", status: "Negado" },
      { id: "3", status: "Aprovado" },
      { id: "4", status: "Pago" },
    ];

    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      if (!id_titulo) {
        throw new Error("ID do título não informado!");
      }
      if (!id_novo_status) {
        throw new Error("ID do novo status não informado!");
      }

      // * Obter titulo e status
      const [rowTitulo] = await conn.execute(
        `SELECT id_status FROM fin_cp_titulos WHERE id = ? `,
        [id_titulo]
      );
      // Rejeitar caso título não encontrado
      if (!rowTitulo || rowTitulo.length === 0) {
        throw new Error(`Titulo de ID: ${id_titulo} não localizado!`);
      }
      const titulo = rowTitulo && rowTitulo[0];

      // Rejeitar caso id_status = '4'
      if (titulo.id_status == "4") {
        throw new Error(
          "Alteração rejeitada pois o título já consta como pago!"
        );
      }
      if (titulo.id_status == "2") {
        //* O título constava como Negado, então agora que o status será alterado, devemos Ativar os registros de consumo:
        await conn.execute(
          `UPDATE fin_orcamento_consumo SET active = true
        WHERE id_titulo_item
      IN(
        SELECT ti.id
            FROM fin_cp_titulos_itens ti
            WHERE ti.id_titulo = ?
        )`,
          [id_titulo]
        );
      }

      // * Update fin_cp_titulos
      await conn.execute(
        `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ? `,
        [id_novo_status, id_titulo]
      );

      // !: Caso Negado - Inativar Consumo Orçamento
      if (id_novo_status == "2") {
        await conn.execute(
          `UPDATE fin_orcamento_consumo SET active = false
        WHERE id_titulo_item
      IN(
        SELECT ti.id
            FROM fin_cp_titulos_itens ti
            WHERE ti.id_titulo = ?
        )`,
          [id_titulo]
        );
      }

      // !: Caso Diferente de Aprovado e Pago - Remover de Borderô
      if (id_novo_status != "3" && id_novo_status != "4") {
        await conn.execute(
          `DELETE FROM fin_cp_titulos_borderos WHERE id_titulo = ? `,
          [id_titulo]
        );
      }
      let historico = ``;
      let author = normalizeFirstAndLastName(user?.nome);
      let textoMotivo = motivo
        ? ` MOTIVO: ${conn.escape(motivo)?.toUpperCase()} `
        : "";

      if (id_novo_status == "1") {
        historico = `RETORNADO PARA SOLICITADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "2") {
        historico = `NEGADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "3") {
        historico = `APROVADO POR: ${author} `;
      }

      // ^ Gerar histórico no título
      if (historico) {
        await conn.execute(
          `INSERT INTO fin_cp_titulos_historico(id_titulo, descricao) VALUES(?, ?)`,
          [id_titulo, historico]
        );
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_CHANGE_STATUS_TITULO_PAGAR", error);
      await conn.rollback();
      reject(error);
    }
  });
}

function changeFieldTitulos(req) {
  return new Promise(async (resolve, reject) => {
    const { type, value, ids } = req.body;
    const conn = await db.getConnection();

    await conn.beginTransaction();
    try {
      if (!type) {
        throw new Error("TIPO de alteração não informado!");
      }
      if (!value) {
        throw new Error("VALOR da alteração não informado!");
      }
      if (ids && ids.length <= 0) {
        throw new Error("SOLICITAÇÕES a serem alteradas não selecionadas!");
      }

      for (const id of ids) {
        if (type == "data_prevista") {
          const [rowTitulo] = await conn.execute(
            `SELECT id_status FROM fin_cp_titulos WHERE id = ? `,
            [id]
          );
          const titulo = rowTitulo && rowTitulo[0];
          if (titulo.id_status == "4") {
            throw new Error(
              `Alteração rejeitada pois o título ${id} já consta como pago!`
            );
          }
          await conn.execute(
            `UPDATE fin_cp_titulos SET data_prevista = ? WHERE id = ? `,
            [new Date(value), id]
          );
        } else if (type === "status") {
          await changeStatusTitulo({
            body: {
              id_titulo: id,
              id_novo_status: value,
            },
          });
        }
      }

      await conn.commit();
      resolve(true);
    } catch (error) {
      await conn.rollback();
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getAllCpTitulosBordero,
  getAllRecorrencias,
  getOne,
  insertOne,
  insertOneRecorrencia,
  update,
  updateFileTitulo,
  changeStatusTitulo,
  changeFieldTitulos,
};
