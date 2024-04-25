const { format } = require("date-fns");
const { db } = require("../../../../mysql");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const { normalizeFirstAndLastName, normalizeCurrency } = require("../../../helpers/mask");

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
        where += ` AND t.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
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
      console.log("ERRO TITULOS PAGAR GET_ALL", error);
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
                fo.nome as nome_fornecedor, 
                fo.cnpj as cnpj_fornecedor,
                fcc.nome as centro_custo,
                fr.manual as rateio_manual,
                CONCAT(pc.codigo, ' - ', pc.descricao) as plano_contas

            FROM fin_cp_titulos t 
            INNER JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN 
                fin_fornecedores fo ON fo.id = t.id_fornecedor
            LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
            LEFT JOIN
                fin_plano_contas pc ON pc.id = t.id_plano_contas
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
      resolve({ titulo, itens, itens_rateio, historico });
      return;
    } catch (error) {
      reject(error);
      return;
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
        where += ` AND t.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
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

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const conn = db.getConnection();
    try {
      await conn.beginTransaction()
      // todo validar campos obrigatórios, data, etc;

      // todo: persistir titulo
      // todo: obter o ID
      // todo: persistir os itens do titulo

      // todo: obter orçamento atual

      // todo: obter os itens do titulo[]
      // todo: persistir o esquema de rateio
      // todo: persistir os titulo_rateio_itens
      // todo: obter conta do orçamento
      // todo: persistir o consumo do orçamento

      // todo: persitir os anexos
      // todo: registar historico: CRIADO POR: fulano;

      await conn.commit()
    } catch (error) {
      await conn.rollback()

    }
  })
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction()
      const data = req.body
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
        itens_rateio,

        url_nota_fiscal,
        url_xml_nota,
        url_boleto,
        url_contrato,
        url_planilha,
        url_txt,

      } = data || {}

      // console.log('NOVOS_DADOS', novos_dados)
      // console.log(`TITULO ${data.id}: ITENS: `,itens)
      // console.log(`TITULO ${data.id}: ITENS_RATEIO: `,itens_rateio)

      // ^ Validações
      // Titulo
      if (!id) {
        throw new Error('ID do título não informado!');
      }
      if (!id_filial) {
        throw new Error('Campo id_filial não informado!');
      }
      if (!id_grupo_economico) {
        throw new Error('Campo id_grupo_economico não informado!');
      }
      if (!id_fornecedor) {
        throw new Error('Campo id_fornecedor não informado!');
      }
      if (!id_forma_pagamento) {
        throw new Error('Campo id_forma_pagamento não informado!');
      }
      if (!id_centro_custo) {
        throw new Error('Campo id_centro_custo não informado!');
      }
      if (!descricao) {
        throw new Error('Campo Descrição não informado!');
      }
      if (!data_vencimento) {
        throw new Error('Campo data_vencimento não informado!');
      }
      if (!data_emissao) {
        throw new Error('Campo data_emissao não informado!');
      }
      if (!data_prevista) {
        throw new Error('Campo data_prevista não informado!');
      }

      // Se for PIX: Exigir id_tipo_chave_pix e chave_pix
      if (id_forma_pagamento === '4') {
        if (!id_tipo_chave_pix || !chave_pix) {
          throw new Error('Selecionado forma de pagamento PIX mas não informado tipo chave ou chave PIX')
        }
      }
      // Se forma de pagamento for na conta, então exigir os dados bancários
      if (id_forma_pagamento === '2' || id_forma_pagamento === '5' || id_forma_pagamento === '8') {
        if (!id_banco || !id_tipo_conta || !agencia || !conta) {
          throw new Error('Preencha corretamente os dádos bancários!')
        }
      }

      // Se tipo solicitação for Com nota, exigir anexos
      if (id_tipo_solicitacao === '1') {
        if (!url_nota_fiscal) {
          throw new Error('Faça o upload da Nota Fiscal!')
        }
      } else {
        if (!url_contrato) {
          throw new Error('Faça o upload do Contrato/Autorização!')
        }
      }

      // Itens
      if (!itens || itens.length === 0) {
        throw new Error('Campo itens não informado!');
      }

      // Esquema de rateio
      if (!itens_rateio || itens_rateio.length === 0) {
        throw new Error('Campo itens_rateio não informado!');
      }



      // Obter dados do Titulo no banco:
      const [rowTitulo] = await conn.execute(`SELECT * FROM fin_cp_titulos WHERE id = ?`, [id]);
      const titulo = rowTitulo && rowTitulo[0]
      if (!titulo) throw new Error('Título não localizado!');
      console.log('TITULO_NO_BANCO', titulo)

      // ^ Vamos validar se orçamento possui saldo:
      // Passamos por cada item novo, analisando o orçamento
      for (const item of itens) {
        // ^ Validar item se possui todos os campos obrigatórios
        if (!item.id_plano_conta) {
          throw new Error(`O item não possui plano de contas selecionado! Item: ${JSON.stringify(item)}`)
        }
        if (!item.valor) {
          throw new Error(`O item não possui valor! Item: ${JSON.stringify(item)}`)
        }

        // Obter o registro de consumo anterior:
        const [rowConsumo] = await conn.execute(`SELECT sum(foc.valor) as valor 
        FROM fin_orcamento_consumo foc
        WHERE foc.id_titulo_item IN (
          SELECT ti.id
          FROM fin_cp_titulos_itens ti
          WHERE ti.id_titulo = ? AND ti.id_plano_conta = ?
        )
        GROUP BY foc.id
      `, [id, item.id_plano_conta])
        let valorConsumidoAnteriormente = rowConsumo && rowConsumo[0] || 0;
        valorConsumidoAnteriormente = parseFloat(valorConsumidoAnteriormente);

        // Obter o saldo do orçamento:
        const [rowOrcamento] = await conn.execute(`SELECT id FROM fin_orcamento WHERE DATE_FORMAT(ref, '%y-%m') = ? and id_grupo_economico = ?`, [format(titulo.created_at, 'yyyy-MM'), id_grupo_economico])

        if (!rowOrcamento || rowOrcamento.length === 0) {
          throw new Error('Orçamento não localizado!')
        }
        if (rowOrcamento.length > 1) {
          throw new Error(`${rowOrcamento.length} orçamentos foram localizados, isso é um erro! Procurar a equipe de desenvolvimento.`)
        }
        const id_orcamento = rowOrcamento && rowOrcamento[0] && rowOrcamento[0]['id']

        // Obter a conta de orçamento:
        const [rowContaOrcamento] = await conn.execute(`SELECT valor_previsto FROM fin_orcamento_contas WHERE id_orcamento = ? AND id_plano_contas = ? `, [id_orcamento, item.id_plano_conta])

        if (!rowContaOrcamento || rowContaOrcamento.length === 0) {
          throw new Error('Não existe saldo no orçamento para o plano de contas!')
        }
        let saldo = rowContaOrcamento && rowContaOrcamento[0] && rowContaOrcamento[0]['valor_previsto']
        saldo = parseFloat(saldo) + valorConsumidoAnteriormente;
        if (saldo < item.valor) {
          throw new Error(`Saldo insuficiente para o plano de contas: ${item.plano_conta}. Necessário ${normalizeCurrency(item.valor - saldo)}`)
        }
      }


      throw new Error('Interrompi...')
      // Itens anteriores
      const [itens_anteriores] = await conn.execute(`SELECT ti.*, CONCAT(pc.codigo, ' - ', pc.descricao) as plano_conta
      FROM fin_cp_titulos_itens t
      INNER JOIN fin_plano_contas pc ON pc.id = ti.id_plano_conta
      WHERE id_titulo = ?`, [titulo.id])

      // todo validar campos obrigatórios, data, etc;
      // todo: persistir titulo
      // todo: persistir os itens do titulo

      // todo: obter orçamento atual

      // todo: obter os itens do titulo[]
      // todo: persistir o esquema de rateio
      // todo: persistir os titulo_rateio_itens
      // todo: obter conta do orçamento
      // todo: persistir o consumo do orçamento

      // todo: persitir os anexos

      // todo: registar historico:
      let modelo =
        `EDITADO POR: ALEX BEZERRA. 
      VENCIMENTO: DE: 29/04/2024 PARA: 25/04/2024
      VALOR: DE: 200,00 PARA: 300,00 
      RATEIO: DE: XXX - MANUAL PARA: R05 - RATEIO TODAS AS FILIAIS 
      DESCRICAO: 
        DE: 'DDKJKDJDKADJAKDADAKDAJKSDJAKJ' 
        PARA: 'DJKADKAJDSAKDJADKASJDKASDJASKDJ431001'
      CENTRO DE CUSTO: 
        DE: ADMINISTRATIVO 
        PARA: DP
      ITENS ANTERIORES: 
        1
          PLANO DE CONTAS: 09.08.01 - COMPRA DE MATERIAL DE ALGO
          VALOR: 150,00 
        2
          PLANO DE CONTAS: 09.08.01 - TESTE
          VALOR: 300,00
        `




      await conn.commit()
      resolve()
    } catch (error) {
      console.log('ERROR_TITULO_PAGAR_UPDATE', error)
      await conn.rollback()
      reject(error)
    }
  })
}

function changeStatusTitulo(req) {
  return new Promise(async (resolve, reject) => {
    const { id_titulo, id_novo_status, motivo } = req.body;
    const user = req.user
    // console.log("REQ.BODY", req.body);

    const tipos_status = [
      { id: '1', status: 'Solicitado' },
      { id: '2', status: 'Negado' },
      { id: '3', status: 'Aprovado' },
      { id: '4', status: 'Pago' },
    ]

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
      const [rowTitulo] = await conn.execute(`SELECT id_status FROM fin_cp_titulos WHERE id = ? `, [id_titulo])
      // Rejeitar caso título não encontrado
      if (!rowTitulo || rowTitulo.length === 0) {
        throw new Error(`Titulo de ID: ${id_titulo} não localizado!`)
      }
      const titulo = rowTitulo && rowTitulo[0]

      // Rejeitar caso id_status = '4'
      if (titulo.id_status == '4') {
        throw new Error('Alteração rejeitada pois o título já consta como pago!')
      }
      if (titulo.id_status == '2') {
        //* O título constava como Negado, então agora que o status será alterado, devemos Ativar os registros de consumo:
        await conn.execute(`UPDATE fin_orcamento_consumo SET active = true
        WHERE id_titulo_item 
        IN (
            SELECT ti.id
            FROM fin_cp_titulos_itens ti
            WHERE ti.id_titulo = ?
        )`, [id_titulo])
      }

      // * Update fin_cp_titulos
      await conn.execute(`UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`, [id_novo_status, id_titulo])

      // !: Caso Negado - Inativar Consumo Orçamento 
      if (id_novo_status == '2') {
        await conn.execute(`UPDATE fin_orcamento_consumo SET active = false
        WHERE id_titulo_item 
        IN (
            SELECT ti.id
            FROM fin_cp_titulos_itens ti
            WHERE ti.id_titulo = ?
        )`, [id_titulo])
      }

      // !: Caso Diferente de Aprovado e Pago - Remover de Borderô 
      if (id_novo_status != '3' && id_novo_status != '4') {
        await conn.execute(`DELETE FROM fin_cp_titulos_borderos WHERE id_titulo = ?`, [id_titulo])
      }
      let historico = ``
      let author = normalizeFirstAndLastName(user?.nome);
      let textoMotivo = motivo ? ` MOTIVO: ${conn.escape(motivo)?.toUpperCase()}` : '';

      if (id_novo_status == '1') {
        historico = `RETORNADO PARA SOLICITADO POR: ${author}.`
        historico += textoMotivo;
      }
      if (id_novo_status == '2') {
        historico = `NEGADO POR: ${author}.`
        historico += textoMotivo;
      }
      if (id_novo_status == '3') {
        historico = `APROVADO POR: ${author}`
      }

      // ^ Gerar histórico no título
      if (historico) {
        await conn.execute(`INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?, ?)`, [id_titulo, historico])
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

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  updateFileTitulo,
  changeStatusTitulo,
  getAllCpTitulosBordero,
};
