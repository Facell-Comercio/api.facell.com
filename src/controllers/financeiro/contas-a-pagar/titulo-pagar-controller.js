const {
  format,
  startOfDay,
  formatDate,
  addDays,
  isMonday,
  isThursday,
  isSaturday,
  isSunday,
  subDays,
  isWednesday,
  isFriday,
} = require("date-fns");
const path = require("path");
const { db } = require("../../../../mysql");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const {
  normalizeFirstAndLastName,
  normalizeCurrency,
  normalizeNumberOnly,
  normalizeCodigoBarras,
} = require("../../../helpers/mask");
const {
  moverArquivoTempParaUploads,
  zipFiles,
  createUploadsPath,
  replaceFileUrl,
} = require("../../files-controller");
const { addMonths } = require("date-fns/addMonths");
const { logger } = require("../../../../logger");
const { checkCodigoBarras } = require("../../../helpers/chekers");
require("dotenv").config();

function checkFeriado(date) {
  // Aqui você pode implementar a lógica para verificar se a data é um feriado
  // Por exemplo, verificar em uma lista de feriados
  // Este é um exemplo simples que considera apenas os feriados fixos no ano
  const feriadosFixos = [
    "01-01",
    "04-21",
    "05-01",
    "09-07",
    "10-12",
    "11-02",
    "11-15",
    "12-25",
  ];
  const formattedDate = format(date, "MM-dd");
  return feriadosFixos.includes(formattedDate);
}

function calcularDataPrevisaoPagamento(data_venc) {
  const dataVencimento = startOfDay(data_venc); // Inicia com o próximo dia

  const dataAtual = startOfDay(new Date());
  let dataMinima = addDays(dataAtual, 2);

  while (
    (!isMonday(dataMinima) &&
      !isWednesday(dataMinima) &&
      !isFriday(dataMinima)) ||
    checkFeriado(dataMinima)
  ) {
    dataMinima = addDays(dataMinima, 1); // Avança para o próximo dia até encontrar uma segunda ou quinta-feira que não seja feriado
  }
  let dataPagamento = dataMinima;

  // 27-04 <= 26-04
  if (dataVencimento <= dataMinima) {
    // A data de vencimento é inferior a data atual,
    //então vou buscar a partir da data atual + 1 a próxima data de pagamento
    while (
      dataPagamento < dataMinima ||
      (!isMonday(dataPagamento) &&
        !isWednesday(dataPagamento) &&
        !isFriday(dataPagamento)) ||
      checkFeriado(dataPagamento)
    ) {
      dataPagamento = addDays(dataPagamento, 1); // Avança para o próximo dia até encontrar uma segunda ou quinta-feira que não seja feriado
    }
  } else {
    dataPagamento = dataVencimento;
    if (isSaturday(dataPagamento)) {
      dataPagamento = addDays(dataPagamento, 2);
    }
    if (isSunday(dataPagamento)) {
      dataPagamento = addDays(dataPagamento, 1);
    }
    while (
      (!isMonday(dataPagamento) &&
        !isWednesday(dataPagamento) &&
        !isFriday(dataPagamento)) ||
      checkFeriado(dataPagamento)
    ) {
      dataPagamento = subDays(dataPagamento, 1); // Avança para o próximo dia até encontrar uma segunda ou quinta-feira que não seja feriado
    }
  }

  return dataPagamento;
}

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const departamentosUser = user.departamentos.map(
      (departamento) => departamento.id
    );

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    var where = ` WHERE 1=1 `;
    //* Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      // where += ` AND t.id_solicitante = '${user.id}'`;
      if (departamentosUser?.length > 0) {
        where += ` AND (t.id_solicitante = '${
          user.id
        }' OR  t.id_departamento IN (${departamentosUser.join(",")})) `;
      } else {
        where += ` AND t.id_solicitante = '${user.id}' `;
      }
    }
    const {
      id,
      id_grupo_economico,
      id_forma_pagamento,
      id_status,
      tipo_data,
      range_data,
      descricao,
      id_matriz,
      arquivados,
      nome_fornecedor,
      nome_user,
      filial,
    } = filters || {};
    const params = [];
    if (id) {
      where += ` AND t.id = ? `;
      params.push(id);
    }
    if (id_status && id_status !== "all") {
      where += ` AND t.id_status = ?`;
      params.push(id_status);
    }
    if (id_forma_pagamento && id_status !== "all") {
      where += ` AND t.id_forma_pagamento = ? `;
      params.push(id_forma_pagamento);
    }
    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (!arquivados) {
      where += ` AND t.id_status != 0 `;
    }

    if (nome_fornecedor) {
      where += ` AND (forn.razao LIKE CONCAT('%', ?, '%') OR  forn.nome LIKE CONCAT('%', ?, '%')) `;
      params.push(nome_fornecedor);
      params.push(nome_fornecedor);
    }

    if (nome_user) {
      where += ` AND u.nome LIKE CONCAT('%', ?, '%') `;
      params.push(nome_user);
    }

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;

      const campo_data =
        tipo_data == "data_prevista" || tipo_data == "data_vencimento"
          ? `tv.${tipo_data}`
          : `t.${tipo_data}`;

      if (data_de && data_ate) {
        where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (filial) {
      where += ` AND f.nome LIKE CONCAT("%", ?,"%")`;
      params.push(filial);
    }
    const conn = await db.getConnection();

    try {
      const [rowsTitulos] = await conn.execute(
        `SELECT count(t.id) as total 
        FROM fin_cp_titulos t 
        LEFT JOIN filiais f ON f.id = t.id_filial 
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        LEFT JOIN users u ON u.id = t.id_solicitante
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
        ${where}
        `,
        params
      );
      const totalTitulos = (rowsTitulos && rowsTitulos[0]["total"]) || 0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      var query = `
            SELECT DISTINCT 
                t.id, s.status, t.created_at, t.descricao, t.valor,
                f.nome as filial, f.id_matriz,
                forn.nome as fornecedor, u.nome as solicitante,
                fp.forma_pagamento
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento

          ${where}

          ORDER BY 
              t.created_at DESC 
          ${limit}`;
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const [titulos] = await conn.execute(query, params);
      // console.log(query, params, titulos);
      const objResponse = {
        rows: titulos,
        pageCount: Math.ceil(totalTitulos / pageSize),
        rowCount: totalTitulos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getAllCpVencimentosBordero(req) {
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
    const {
      id_vencimento,
      id_titulo,
      id_grupo_economico,
      tipo_data,
      fornecedor,
      range_data,
      descricao,
      id_matriz,
      id_filial,
      id_conta_bancaria,
      dda,
      termo,
    } = filters || {};

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
    if (id_vencimento) {
      where += ` AND tv.id = ? `;
      params.push(id_vencimento);
    }

    if (id_titulo) {
      where += ` AND tv.id_titulo = ? `;
      params.push(id_titulo);
    }

    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%')  `;
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

    if (dda !== undefined) {
      if (dda == "true") {
        where += ` AND dda.id IS NOT NULL `;
      }
      if (dda == "false") {
        where += ` AND dda.id IS NULL `;
      }
    }

    where += ` 
    AND (t.id_status = 3 OR t.id_status = 4) 
    AND tb.id_vencimento IS NULL `;

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND tv.${tipo_data} BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          where += ` AND tv.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND tv.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    // console.log(where)

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT DISTINCT 
          tv.id 
          FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id

          ${where}
        ) AS subconsulta
        `,
        params
      );
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      var query = `
            SELECT DISTINCT 
                t.id as id_titulo, t.id_status, UPPER(t.descricao) as descricao,
                tv.id as id_vencimento, tv.status, tv.data_prevista as previsao, 
                tv.valor as valor_total, tv.data_vencimento as data_pagamento,
                f.nome as filial, f.id_matriz,
                forn.nome as nome_fornecedor, t.num_doc, 
                fp.forma_pagamento
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
            LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
            
            ${where}

            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      // console.log(query);
      // console.log(params);
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ALL_VENCIMENTOS_BORDERO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    } finally {
      conn.release();
    }
  });
}

// * ok
function getAllRecorrencias(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const conn = await db.getConnection();
    const departamentosUser = user.departamentos.map(
      (departamento) => departamento.id
    );

    try {
      const { user } = req;
      const { filters } = req.query || {};
      const { mes, ano } = filters || {
        mes: format(new Date(), "MM"),
        ano: format(new Date(), "yyyy"),
      };
      const params = [];
      let where = "WHERE 1=1 ";

      if (
        !checkUserPermission(req, "MASTER") &&
        !checkUserDepartment(req, "FINANCEIRO")
      ) {
        if (departamentosUser?.length > 0) {
          where += ` AND (r.id_user = '${
            user.id
          }' OR t.id_departamento IN (${departamentosUser.join(",")})) `;
        } else {
          where += ` AND r.id_user = '${user.id}' `;
        }
      }

      where += ` AND YEAR(r.data_vencimento) = ?
        AND MONTH(r.data_vencimento) = ?`;
      params.push(ano);
      params.push(mes);

      const [recorrencias] = await conn.execute(
        `SELECT 
          r.*,
          UPPER(t.descricao) as descricao, r.valor,
          forn.nome as fornecedor,
          f.nome as filial, f.id_matriz,
          ge.nome as grupo_economico,
          u.nome as criador
        FROM fin_cp_titulos_recorrencias r 
        LEFT JOIN fin_cp_titulos t ON t.id = r.id_titulo
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
        LEFT JOIN users u ON u.id = r.id_user
        ${where}
        ORDER BY r.data_vencimento
        `,
        params
      );
      resolve({ rows: recorrencias });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ALL_RECORRENCIAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// * ok
function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    // console.log(req.params)
    const conn = await db.getConnection();
    try {
      const [rowTitulo] = await conn.execute(
        `
        SELECT t.*, st.status,
                f.nome as filial,
                f.id_grupo_economico,
                f.id_matriz,
                fb.nome as banco,
                fb.codigo as codigo_banco,
                fo.nome as nome_fornecedor, 
                fo.cnpj as cnpj_fornecedor,
                t.id_departamento,
                COALESCE(fr.manual, TRUE) as rateio_manual

            FROM fin_cp_titulos t 
            INNER JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN fin_bancos fb ON fb.id = t.id_banco
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN 
                fin_fornecedores fo ON fo.id = t.id_fornecedor
            LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
            WHERE t.id = ?
            `,
        [id]
      );

      const [vencimentos] = await conn.execute(
        `SELECT 
          tv.id, tv.data_vencimento, tv.data_prevista, tv.valor, tv.cod_barras, tv.qr_code 
        FROM fin_cp_titulos_vencimentos tv 
        WHERE tv.id_titulo = ? 
        `,
        [id]
      );

      const [itens_rateio] = await conn.execute(
        `SELECT 
          tr.*,
          f.nome as filial,
          fcc.nome  as centro_custo,
          CONCAT(fpc.codigo, ' - ', fpc.descricao) as plano_conta, 
          FORMAT(tr.percentual * 100, 2) as percentual
        FROM 
          fin_cp_titulos_rateio tr 
        LEFT JOIN filiais f ON f.id = tr.id_filial
        LEFT JOIN fin_centros_custo fcc ON fcc.id = tr.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = tr.id_plano_conta
          WHERE tr.id_titulo = ?`,
        [id]
      );

      const [historico] = await conn.execute(
        `SELECT * FROM fin_cp_titulos_historico WHERE id_titulo = ? ORDER BY created_at DESC`,
        [id]
      );

      const titulo = rowTitulo && rowTitulo[0];
      // console.log(titulo)
      const objResponse = { titulo, vencimentos, itens_rateio, historico };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function getOneByTimParams(req) {
  return new Promise(async (resolve, reject) => {
    const { num_doc, cnpj_fornecedor } = req.query;

    // console.log(req.params)
    const conn = await db.getConnection();
    try {
      if (!num_doc) {
        throw new Error("Número da nota fiscal não informado!");
      }
      if (!cnpj_fornecedor) {
        throw new Error("CNPJ do fornecedor não informado!");
      }

      const numDoc = parseInt(num_doc);
      const cnpjFornecedor = parseInt(cnpj_fornecedor);

      const [rowTitulo] = await conn.execute(
        `
        SELECT t.*, st.status,
                f.nome as filial,
                f.id_grupo_economico,
                f.id_matriz,
                fb.nome as banco,
                fb.codigo as codigo_banco,
                fo.nome as nome_fornecedor, 
                fo.cnpj as cnpj_fornecedor,
                COALESCE(fr.manual, TRUE) as rateio_manual

            FROM fin_cp_titulos t 
            INNER JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN fin_bancos fb ON fb.id = t.id_banco
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN 
                fin_fornecedores fo ON fo.id = t.id_fornecedor
            LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
            WHERE 
            CAST(t.num_doc AS UNSIGNED) = ? 
            AND CAST(fo.cnpj AS UNSIGNED) = ?
            `,
        [numDoc, cnpjFornecedor]
      );
      const titulo = (rowTitulo && rowTitulo[0]) || null;

      if (!titulo) {
        resolve(null);
        return;
      }

      const [vencimentos] = await conn.execute(
        `SELECT 
          tv.id, tv.data_vencimento, tv.data_prevista, tv.valor, tv.cod_barras 
        FROM fin_cp_titulos_vencimentos tv 
        WHERE tv.id_titulo = ? 
        `,
        [titulo.id]
      );

      const [itens_rateio] = await conn.execute(
        `SELECT 
          tr.*,
          f.nome as filial,
          fcc.nome  as centro_custo,
          CONCAT(fpc.codigo, ' - ', fpc.descricao) as plano_conta, 
          FORMAT(tr.percentual * 100, 2) as percentual
        FROM 
          fin_cp_titulos_rateio tr 
        LEFT JOIN filiais f ON f.id = tr.id_filial
        LEFT JOIN fin_centros_custo fcc ON fcc.id = tr.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = tr.id_plano_conta
          WHERE tr.id_titulo = ?`,
        [titulo.id]
      );

      const [historico] = await conn.execute(
        `SELECT * FROM fin_cp_titulos_historico WHERE id_titulo = ? ORDER BY created_at DESC`,
        [titulo.id]
      );

      // console.log(titulo)
      const objResponse = { titulo, vencimentos, itens_rateio, historico };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ONE_BY_TIM_PARAMS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function getPendencias(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const conn = await db.getConnection();
    try {
      if (
        checkUserDepartment(req, "FINANCEIRO") ||
        checkUserPermission(req, "MASTER")
      ) {
        resolve(0);
        return;
      }

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT
            t.id 
          FROM fin_cp_titulos t 
          LEFT JOIN fin_cp_status s ON s.id = t.id_status 
          LEFT JOIN filiais f ON f.id = t.id_filial 
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN users u ON u.id = t.id_solicitante

          WHERE t.id_tipo_solicitacao = 2
          AND NOT t.id_status = 2 
          AND NOT t.id_status = 0 
          AND t.data_emissao < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          AND (t.url_nota_fiscal IS NULL OR t.url_nota_fiscal = "")
          AND t.id_solicitante = '${user.id}'
        ) AS subconsulta
        `
      );
      //^ Retirado do WHERE
      // t.id_status = 4 OR t.id_status = 5
      //       OR
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;
      resolve(totalVencimentos);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_PENDENCIAS_NOTAS_FISCAIS_TITULOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// * ok
function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { user } = req;
      const data = req.body;
      const {
        id_recorrencia,

        // Fornecedor
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
        id_tipo_solicitacao,
        id_filial,
        id_departamento,
        id_grupo_economico,
        id_matriz,

        data_emissao,

        num_doc,
        valor,
        descricao,

        vencimentos,

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
      // console.log(`TITULO ${data.id}: VENCIMENTOS: `,vencimentos)
      // console.log(`TITULO ${data.id}: ITENS_RATEIO: `,itens_rateio)

      // ^ Validações
      // Titulo
      if (!id_filial) {
        throw new Error("Campo id_filial não informado!");
      }
      if (!id_departamento) {
        throw new Error("Campo id_departamento não informado!");
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
      if (!descricao) {
        throw new Error("Campo Descrição não informado!");
      }
      if (!data_emissao) {
        throw new Error("Campo data_emissao não informado!");
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
      if (id_forma_pagamento === "2" || id_forma_pagamento === "5") {
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

      if (!vencimentos || vencimentos.length === 0) {
        throw new Error("Vencimento(s) não informado(s)!");
      }

      // Rateio
      if (!itens_rateio || itens_rateio.length === 0) {
        throw new Error("Campo itens_rateio não informado!");
      }

      // ^ Passamos por cada vencimento, validando os campos
      for (const vencimento of vencimentos) {
        const valorVencimento = parseFloat(vencimento.valor);
        // ^ Validar vencimento se possui todos os campos obrigatórios
        if (!vencimento.data_vencimento) {
          throw new Error(
            `O vencimento não possui data de vencimento! Vencimento: ${JSON.stringify(
              vencimento
            )}`
          );
        }
        if (!vencimento.data_prevista) {
          throw new Error(
            `O vencimento não possui data prevista para pagamento! Vencimento: ${JSON.stringify(
              vencimento
            )}`
          );
        }
        if (!valorVencimento) {
          throw new Error(
            `O vencimento não possui valor! Item: ${JSON.stringify(vencimento)}`
          );
        }
        vencimento.valor = valorVencimento;
      }

      // ^ Passamos por cada item de rateio, validando os campos
      for (const item_rateio of itens_rateio) {
        // ^ Validar vencimento se possui todos os campos obrigatórios
        if (!item_rateio.id_filial) {
          throw new Error(
            `ID Filial não informado para o item de rateio: ${JSON.stringify(
              item_rateio
            )}`
          );
        }
        if (!item_rateio.id_centro_custo) {
          throw new Error(
            `ID CENTRO DE CUSTO não informado para o item de rateio: ${JSON.stringify(
              item_rateio
            )}`
          );
        }
        if (!item_rateio.id_plano_conta) {
          throw new Error(
            `ID PLANO DE CONTAS não informado para o item de rateio: ${JSON.stringify(
              item_rateio
            )}`
          );
        }
        const valorRateio = parseFloat(item_rateio.valor);
        const percentualRateio = parseFloat(item_rateio.percentual);
        if (!valorRateio) {
          throw new Error(
            `Valor não informado para o item de rateio: ${JSON.stringify(
              item_rateio
            )}`
          );
        }
        if (!percentualRateio) {
          throw new Error(
            `Percentual não informado para o item de rateio: ${JSON.stringify(
              item_rateio
            )}`
          );
        }
        item_rateio.valor = valorRateio;
        item_rateio.percentual = percentualRateio;
      }

      // * Verificar se o Grupo valida orçamento
      const [rowGrupoEconomico] = await conn.execute(
        `SELECT orcamento FROM grupos_economicos WHERE id = ?`,
        [id_grupo_economico]
      );
      const grupoValidaOrcamento =
        rowGrupoEconomico &&
        rowGrupoEconomico[0] &&
        !!+rowGrupoEconomico[0]["orcamento"];

      // * Obter o Orçamento:
      const [rowOrcamento] = await conn.execute(
        `SELECT id, active FROM fin_orcamento WHERE DATE_FORMAT(ref, '%Y-%m') = ? and id_grupo_economico = ?`,
        [format(new Date(), "yyyy-MM"), id_grupo_economico]
      );

      if (
        grupoValidaOrcamento &&
        (!rowOrcamento || rowOrcamento.length === 0)
      ) {
        throw new Error("Orçamento não localizado!");
      }
      if (rowOrcamento.length > 1) {
        throw new Error(
          `${rowOrcamento.length} orçamentos foram localizados, isso é um erro! Procurar a equipe de desenvolvimento.`
        );
      }
      const orcamentoAtivo =
        rowOrcamento && rowOrcamento[0] && !!+rowOrcamento[0]["active"];
      const id_orcamento =
        rowOrcamento && rowOrcamento[0] && rowOrcamento[0]["id"];

      // * Persitir os anexos
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
          id_departamento,
          
          data_emissao,
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

          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
          user.id,
          id_fornecedor,
          id_banco || null,
          id_forma_pagamento,

          agencia || null,
          dv_agencia || null,
          id_tipo_conta || null,
          conta || null,
          dv_conta || null,
          favorecido || null,
          cnpj_favorecido,

          id_tipo_chave_pix || null,
          chave_pix || null,

          id_tipo_solicitacao,
          id_filial,
          id_departamento,

          startOfDay(data_emissao),
          num_doc,
          valor,
          descricao,

          id_rateio || null,

          nova_url_nota_fiscal || null,
          nova_url_xml || null,
          nova_url_boleto || null,
          nova_url_contrato || null,
          nova_url_planilha || null,
          nova_url_txt || null,
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
        await conn.execute(
          `INSERT INTO fin_cp_titulos_recorrencias (id_user, id_titulo, data_vencimento, valor) VALUES (?, ?, ?, ?)`,
          [
            user.id,
            newId,
            addMonths(new Date(vencimentos[0].data_vencimento), 1),
            valor,
          ]
        );
      }

      // * Salvar os novos vencimentos
      for (const vencimento of vencimentos) {
        // * Persistir o vencimento do titulo e obter o id:

        // Código de Barras
        const cod_barras = !!vencimento.cod_barras
          ? normalizeCodigoBarras(vencimento.cod_barras)
          : null;
        if (!!cod_barras && !checkCodigoBarras(cod_barras)) {
          throw new Error(`Linha Digitável inválida: ${cod_barras}`);
        }
        // PIX QR Code
        const qr_code = vencimento.qr_code || null;
        if (id_forma_pagamento == "8" && !qr_code) {
          throw new Error("Preencha o PIX Copia e Cola!");
        }

        await conn.execute(
          `INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, cod_barras, valor, qr_code) VALUES (?,?,?,?,?,?)`,
          [
            newId,
            startOfDay(vencimento.data_vencimento),
            startOfDay(vencimento.data_prevista),
            cod_barras,
            vencimento.valor,
            qr_code,
          ]
        );
      }
      //~ Fim de manipulação de vencimentos //////////////////////

      // * Persistir o rateio
      for (const item_rateio of itens_rateio) {
        // Validar os campos do item rateio:

        // * Persistir Item Rateio
        const [resultInsertItemRateio] = await conn.execute(
          `INSERT INTO fin_cp_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, percentual) VALUES (?,?,?,?,?,?)`,
          [
            newId,
            item_rateio.id_filial,
            item_rateio.id_centro_custo,
            item_rateio.id_plano_conta,
            item_rateio.valor,
            item_rateio.percentual,
          ]
        );

        if (orcamentoAtivo) {
          // ^ Vamos validar se orçamento possui saldo:
          // Obter a Conta de Orçamento com o Valor Previsto:
          const [rowOrcamentoConta] = await conn.execute(
            `SELECT id, valor_previsto, active FROM fin_orcamento_contas 
          WHERE 
            id_orcamento = ?
            AND id_centro_custo = ?
            AND id_plano_contas = ?
            `,
            [
              id_orcamento,
              item_rateio.id_centro_custo,
              item_rateio.id_plano_conta,
            ]
          );

          if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
            throw new Error(
              `Não existe conta no orçamento para ${item_rateio.centro_custo}: ${item_rateio.plano_conta}!`
            );
          }

          const contaOrcamentoAtiva =
            rowOrcamentoConta &&
            rowOrcamentoConta[0] &&
            !!+rowOrcamentoConta[0]["active"];

          const id_orcamento_conta =
            rowOrcamentoConta &&
            rowOrcamentoConta[0] &&
            rowOrcamentoConta[0]["id"];

          let valor_previsto =
            rowOrcamentoConta &&
            rowOrcamentoConta[0] &&
            rowOrcamentoConta[0]["valor_previsto"];
          valor_previsto = parseFloat(valor_previsto);

          // Obter o Valor Realizado da Conta do Orçamento :
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
          if (contaOrcamentoAtiva && saldo < item_rateio.valor) {
            throw new Error(
              `Saldo insuficiente para ${item_rateio.centro_custo}: ${
                item_rateio.plano_conta
              }. Necessário ${normalizeCurrency(item_rateio.valor - saldo)}`
            );
          }

          // * Persistir a conta de consumo do orçamento:
          await conn.execute(
            `INSERT INTO fin_orcamento_consumo (id_orcamento_conta, id_item_rateio, valor) VALUES (?,?,?)`,
            [
              id_orcamento_conta,
              resultInsertItemRateio.insertId,
              item_rateio.valor,
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
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "INSERT_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// * ok
function insertOneRecorrencia(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { user } = req;
      const data = req.body;
      const { id, data_vencimento, valor } = data || {};
      // console.log(data);

      // ~ Criação da data do mês seguinte
      const new_data_vencimento = addMonths(data_vencimento, 1);
      // console.log(new_data_vencimento);

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
          valor,
          id_user
        )
          VALUES (?,?,?,?)
        `,
        [id, new Date(new_data_vencimento), valor, user.id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "INSERT_ONE_RECORRENCIA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// ^ Testes
function insertOneByGN(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { user } = req;

      const {
        id_filial,
        id_grupo_economico,

        id_fornecedor,
        // Geral
        data_emissao,
        data_vencimento,
        num_doc, //! nota fiscal
        valor,
      } = req.body || {};

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
      if (!data_emissao) {
        throw new Error("Campo data_emissao não informado!");
      }
      if (!data_vencimento) {
        throw new Error("Campo data_vencimento não informado!");
      }

      const descricao = `COMPRA DE MERCADORIA TIM - NF ${num_doc}`; // COMPRA DE MERCADORIA TIM - NF XXX
      const url_contrato =
        process.env.BASE_URL + "/uploads/lacamento-automatico.pdf"; //^ fixar um anexo salvo em uploads
      const id_tipo_solicitacao = 3; // 3 - Sem nota fiscal
      const id_status = 3;
      const id_forma_pagamento = 1;

      // Buscar o Centro de custo pelo grupo econômico
      const [rowCentroCusto] = await conn.execute(
        `SELECT id FROM fin_centros_custo WHERE nome = 'COMPRAS' AND id_grupo_economico = ?`,
        [id_grupo_economico]
      );
      const id_centro_custo =
        rowCentroCusto && rowCentroCusto[0] && rowCentroCusto[0]["id"];
      if (!id_centro_custo) {
        throw new Error(
          `Centro de custo COMPRAS não localizado para o id_grupo_economico ${id_grupo_economico}. Providencie o cadastro junto à Administração.`
        );
      }

      // Buscar o plano de contas pelo grupo econômico
      // ! Verificar se podemos fixar no de APARELHO, já que não vamos conseguir identificar o tipo de compra;
      const [rowPlanoConta] = await conn.execute(
        `SELECT id FROM fin_plano_contas WHERE nome = 'COMPRA DE MERCADORIA PARA REVENDA - APARELHO' AND id_grupo_economico = ?`,
        [id_grupo_economico]
      );

      const id_plano_conta =
        rowPlanoConta && rowPlanoConta[0] && rowPlanoConta[0]["id"];
      if (!id_plano_conta) {
        throw new Error(
          `Plano de contas COMPRA DE MERCADORIA PARA REVENDA - APARELHO não localizado para o id_grupo_economico ${id_grupo_economico}. Providencie o cadastro junto à Administração.`
        );
      }

      const vencimento = {
        data_vencimento: data_vencimento,
        data_prevista: calcularDataPrevisaoPagamento(data_vencimento),
        valor: valor,
      };

      //* Salvar o título e obter o id
      const [insertedTitulo] = await conn.execute(
        `INSERT INTO fin_cp_titulos
      (
        id_fornecedor,
        id_filial,
        id_grupo_economico,
        id_tipo_solicitacao,
        id_status,
        id_forma_pagamento,
        
        data_emissao,
        descricao,
        num_doc,
        valor,
        url_contrato
      ) 
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
       `,
        [
          id_fornecedor,
          id_filial,
          id_grupo_economico,
          id_tipo_solicitacao,
          id_status,
          id_forma_pagamento,

          data_emissao,
          descricao,
          num_doc,
          valor,
          url_contrato,
        ]
      );
      const id_titulo = insertedTitulo.insertId;

      //* Salvar o vencimento
      await conn.execute(
        `INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, valor) VALUES (?,?,?,?)`,
        [
          id_titulo,
          vencimento.data_vencimento,
          vencimento.data_prevista,
          vencimento.valor,
        ]
      );

      // Salvar o rateio
      await conn.execute(
        `INSERT INTO fin_cp_titulos_rateio (
        id_titulo, 
        id_filial, 
        id_centro_custo, 
        id_plano_conta, 
        valor, 
        percentual
      ) VALUES (?,?,?,?,?,?)`,
        [id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, 1.0]
      );

      // ^ Verificar com Eriverton se vai querer consumir a conta de orçamento (acredito que não)

      // Gerar e Registar historico:
      let historico = `CRIADO POR: ${normalizeFirstAndLastName(user.nome)}.\n`;

      await conn.execute(
        `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [newId, historico]
      );

      await conn.commit();
      resolve({ id: id_titulo });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "INSERT_ONE_BY_GN",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// * ok
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
        id_departamento,
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
        data_emissao,

        num_doc,
        valor,

        id_tipo_solicitacao,
        descricao,

        update_vencimentos,
        vencimentos,

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
      // console.log(`TITULO ${data.id}: ITENS: `,vencimentos)
      // console.log(`TITULO ${data.id}: ITENS_RATEIO: `,itens_rateio)

      // ^ Validações
      // Titulo
      if (!id) {
        throw new Error("ID do título não informado!");
      }
      if (!id_filial) {
        throw new Error("Campo id_filial não informado!");
      }
      if (!id_departamento) {
        throw new Error("Campo id_departamento não informado!");
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
      if (!descricao) {
        throw new Error("Campo Descrição não informado!");
      }
      if (!data_emissao) {
        throw new Error("Campo data_emissao não informado!");
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
      if (id_forma_pagamento === "2" || id_forma_pagamento === "5") {
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

      // Vencimentos
      if (!vencimentos || vencimentos.length === 0) {
        throw new Error("Campo vencimentos não informado!");
      }

      // Rateio
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

      // ^ Validar se algum vencimento já foi pago, se sim, abortar.
      const [vencimentosPagos] = await conn.execute(
        "SELECT id FROM fin_cp_titulos_vencimentos WHERE id_titulo = ? AND NOT data_pagamento IS NULL",
        [id]
      );
      if (vencimentosPagos && vencimentosPagos.length) {
        throw new Error(
          `Impossível editar a solicitação pois já existem ${vencimentosPagos.length} vencimentos pagos..`
        );
      }

      // ^ Vamos verificar se algum vencimento está em bordero, se estiver, vamos impedir a alteração:
      const [vencimentosEmBordero] = await conn.execute(
        `SELECT tb.id FROM fin_cp_titulos_borderos tb 
        INNER JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento 
        WHERE tv.id_titulo = ?`,
        [id]
      );
      if (vencimentosEmBordero && vencimentosEmBordero.length > 0) {
        throw new Error(
          `Você não pode alterar a solicitação pois ${vencimentosEmBordero.length} vencimentos já estão em bordero de pagamento.`
        );
      }

      // Obter os Vencimentos anteriores para registra-los no histórico caso precise
      const [vencimentos_anteriores] = await conn.execute(
        `SELECT tv.*
        FROM fin_cp_titulos_vencimentos tv
        WHERE tv.id_titulo = ?`,
        [titulo.id]
      );

      // * Verificar se o Grupo valida orçamento
      const [rowGrupoEconomico] = await conn.execute(
        `SELECT orcamento FROM grupos_economicos WHERE id = ?`,
        [id_grupo_economico]
      );
      const grupoValidaOrcamento =
        rowGrupoEconomico &&
        rowGrupoEconomico[0] &&
        !!+rowGrupoEconomico[0]["orcamento"];

      // * Obter o Orçamento:
      const [rowOrcamento] = await conn.execute(
        `SELECT id, active FROM fin_orcamento WHERE DATE_FORMAT(ref, '%Y-%m') = ? and id_grupo_economico = ?`,
        [format(titulo.created_at, "yyyy-MM"), id_grupo_economico]
      );

      if (
        grupoValidaOrcamento &&
        (!rowOrcamento || rowOrcamento.length === 0)
      ) {
        throw new Error("Orçamento não localizado!");
      }
      if (rowOrcamento.length > 1) {
        throw new Error(
          `${rowOrcamento.length} orçamentos foram localizados, isso é um erro! Procurar a equipe de desenvolvimento.`
        );
      }

      const orcamentoAtivo =
        rowOrcamento && rowOrcamento[0] && !!+rowOrcamento[0]["active"];
      const id_orcamento =
        rowOrcamento && rowOrcamento[0] && rowOrcamento[0]["id"];

      // ~ Início de Manipulação de Rateio //////////////////////
      // * Validação de orçamento e atualização do rateio
      if (update_rateio) {
        if (!id_orcamento) {
          throw new Error("Orçamento não localizado!");
        }

        // ! Excluir Antigo rateio
        await conn.execute(
          `DELETE FROM fin_cp_titulos_rateio WHERE id_titulo = ?`,
          [id]
        );

        // * Persistir o rateio
        for (const item_rateio of itens_rateio) {
          const valorRateio = parseFloat(item_rateio.valor);
          if (!valorRateio) {
            throw new Error(
              `O Rateio não possui Valor! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }
          if (!item_rateio.id_filial) {
            throw new Error(
              `O Rateio não possui Filial! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }
          if (!item_rateio.id_centro_custo) {
            throw new Error(
              `O Rateio não possui Centro de custo! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }
          if (!item_rateio.id_plano_conta) {
            throw new Error(
              `O Rateio não possui Plano de contas! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }

          // ! Excluir o consumo do orçamento pelo titulo
          await conn.execute(
            `DELETE FROM fin_orcamento_consumo 
            WHERE id_item_rateio IN (
              SELECT id FROM fin_cp_titulos_rateio WHERE id_titulo = ?
            )`,
            [id]
          );

          if (orcamentoAtivo) {
            // ^ Vamos validar se orçamento possui saldo:
            // Obter a Conta de Orçamento com o Valor Previsto [orçado]:
            const [rowOrcamentoConta] = await conn.execute(
              `SELECT id, valor_previsto, active FROM fin_orcamento_contas 
          WHERE 
            id_orcamento = ?
            AND id_centro_custo = ?
            AND id_plano_contas = ?
            `,
              [
                id_orcamento,
                item_rateio.id_centro_custo,
                item_rateio.id_plano_conta,
              ]
            );

            if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
              throw new Error(
                `Não existe conta no orçamento para o ${item_rateio.centro_custo} + ${item_rateio.plano_conta}!`
              );
            }

            const contaOrcamentoAtiva =
              rowOrcamentoConta &&
              rowOrcamentoConta[0] &&
              !!+rowOrcamentoConta[0]["active"];

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
            if (contaOrcamentoAtiva && saldo < valorRateio) {
              throw new Error(
                `Saldo insuficiente para ${item_rateio.centro_custo} + ${
                  item_rateio.plano_conta
                }. Necessário ${normalizeCurrency(valorRateio - saldo)}`
              );
            }

            const [result] = await conn.execute(
              `INSERT INTO fin_cp_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, percentual, valor) VALUES (?,?,?,?,?,?)`,
              [
                id,
                item_rateio.id_filial,
                item_rateio.id_centro_custo,
                item_rateio.id_plano_conta,
                item_rateio.percentual,
                valorRateio,
              ]
            );
            // * Persistir a conta de consumo do orçamento:
            await conn.execute(
              `INSERT INTO fin_orcamento_consumo (id_orcamento_conta, id_item_rateio, valor) VALUES (?,?,?)`,
              [id_orcamento_conta, result.insertId, valorRateio]
            );
          }
        }
      }
      // ~ Fim de Manipulação de Rateio //////////////////////

      // * Manipulação de vencimentos - caso update_vencimentos = true //////////////////////
      if (update_vencimentos) {
        // ! Excluir Antigos Vencimentos
        await conn.execute(
          `DELETE FROM fin_cp_titulos_vencimentos WHERE id_titulo = ?`,
          [id]
        );

        // Passamos por cada vencimento novo, validando campos e inserindo no banco
        for (const vencimento of vencimentos) {
          // ^ Validar se vencimento possui todos os campos obrigatórios
          const valorVencimento = parseFloat(vencimento.valor);

          if (!vencimento.data_vencimento) {
            throw new Error(
              `O vencimento não possui data de vencimento! Vencimento: ${JSON.stringify(
                vencimento
              )}`
            );
          }
          if (!vencimento.data_prevista) {
            throw new Error(
              `O vencimento não possui data prevista para pagamento! Vencimento: ${JSON.stringify(
                vencimento
              )}`
            );
          }
          if (!valorVencimento) {
            throw new Error(
              `O vencimento não possui valor! Item: ${JSON.stringify(
                vencimento
              )}`
            );
          }

          // * Persistir o vencimento
          // Código de Barras
          const cod_barras = !!vencimento.cod_barras
            ? normalizeCodigoBarras(vencimento.cod_barras)
            : null;
          if (
            id_forma_pagamento == "1" &&
            !!vencimento.cod_barras &&
            !checkCodigoBarras(cod_barras)
          ) {
            throw new Error(`Linha Digitável inválida: ${cod_barras}`);
          }
          // PIX QR Code
          const qr_code = vencimento.qr_code || null;
          if (id_forma_pagamento == "8" && !qr_code) {
            throw new Error("Preencha o PIX Copia e Cola!");
          }

          await conn.execute(
            `INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, valor, cod_barras, qr_code) VALUES (?,?,?,?,?,?)`,
            [
              id,
              formatDate(vencimento.data_vencimento, "yyyy-MM-dd"),
              formatDate(vencimento.data_prevista, "yyyy-MM-dd"),
              valorVencimento,
              cod_barras,
              qr_code,
            ]
          );
        }
      }
      //~ Fim de manipulação de vencimentos //////////////////////

      // Persitir os anexos

      const nova_url_nota_fiscal = await replaceFileUrl({
        oldFileUrl: titulo.url_nota_fiscal,
        newFileUrl: url_nota_fiscal,
      });
      const nova_url_xml = await replaceFileUrl({
        oldFileUrl: titulo.url_xml,
        newFileUrl: url_xml,
      });
      const nova_url_boleto = await replaceFileUrl({
        oldFileUrl: titulo.url_boleto,
        newFileUrl: url_boleto,
      });
      const nova_url_contrato = await replaceFileUrl({
        oldFileUrl: titulo.url_contrato,
        newFileUrl: url_contrato,
      });
      const nova_url_planilha = await replaceFileUrl({
        oldFileUrl: titulo.url_planilha,
        newFileUrl: url_planilha,
      });
      const nova_url_txt = await replaceFileUrl({
        oldFileUrl: titulo.url_txt,
        newFileUrl: url_txt,
      });

      // console.log(id_rateio);
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
        id_departamento = ?,
        
        data_emissao = ?,
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
          id_banco || null,
          id_forma_pagamento,

          agencia || null,
          dv_agencia,
          id_tipo_conta || null,
          conta || null,
          dv_conta,
          favorecido || null,
          cnpj_favorecido || null,

          id_tipo_chave_pix || null,
          chave_pix || null,

          id_tipo_solicitacao,
          id_filial,
          id_departamento,

          startOfDay(data_emissao),
          num_doc || null,
          valor,
          descricao,

          id_rateio || null,

          nova_url_nota_fiscal || null,
          nova_url_xml || null,
          nova_url_boleto || null,
          nova_url_contrato || null,
          nova_url_planilha || null,
          nova_url_txt || null,

          // ID do título ao final!
          id,
        ]
      );

      // Gerar e Registar historico:
      let historico = `EDITADO POR: ${normalizeFirstAndLastName(user.nome)}.\n`;

      if (valor != titulo.valor) {
        historico += `VALOR: DE: ${normalizeCurrency(
          titulo.valor
        )} PARA: ${normalizeCurrency(valor)}\n`;
      }
      if (descricao != titulo.descricao) {
        historico += `DESCRICAO:\n \t DE: '${titulo.descricao}'\n \tPARA: '${descricao}'\n`;
      }

      if (update_vencimentos) {
        historico += `VENCIMENTOS ANTERIORES:\n `;
        vencimentos_anteriores.forEach((venc_anterior, index) => {
          historico += `\t VENCIMENTO ${index + 1}: \n`;
          historico += `\t DATA VENC.: '${formatDate(
            venc_anterior.data_vencimento,
            "dd/MM/yyyy"
          )}' \n`;
          historico += `\t DATA PREV..: '${formatDate(
            venc_anterior.data_prevista,
            "dd/MM/yyyy"
          )}' \n`;
          historico += `\t VALOR: '${normalizeCurrency(
            venc_anterior.valor
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
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function updateFileTitulo(req) {
  return new Promise(async (resolve, reject) => {
    const { id, fileUrl, campo } = req.body;
    const conn = await db.getConnection();

    try {
      console.log({ fileUrl });
      await conn.beginTransaction();

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

      const [rowTitulo] = await conn.execute(
        `SELECT ${campo} FROM fin_cp_titulos WHERE id = ?`,
        [id]
      );
      const titulo = rowTitulo && rowTitulo[0];
      if (!titulo) {
        throw new Error("Solicitação não existe no sistema...");
      }
      const newUrl = await replaceFileUrl({
        oldFileUrl: titulo[campo],
        newFileUrl: fileUrl,
      });

      await conn.execute(
        `UPDATE fin_cp_titulos SET ${campo} = ? WHERE id = ? `,
        [newUrl, id]
      );

      await conn.commit();
      resolve({ fileUrl: newUrl });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "UPDATE_FILE_TITULO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

// * ok
function changeStatusTitulo(req) {
  return new Promise(async (resolve, reject) => {
    const { id_titulo, id_novo_status, motivo } = req.body;
    const user = req.user;
    // console.log("REQ.BODY", req.body);

    const tipos_status = [
      { id: "0", status: "Arquivado" },
      { id: "1", status: "Solicitado" },
      { id: "2", status: "Negado" },
      { id: "3", status: "Aprovado" },
      { id: "4", status: "Pago Parcial" },
      { id: "5", status: "Pago" },
    ];

    const conn = await db.getConnection();
    try {
      if (!id_titulo) {
        throw new Error("ID do título não informado!");
      }
      if (!id_novo_status) {
        throw new Error("ID do novo status não informado!");
      }
      await conn.beginTransaction();

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

      // Rejeitar caso id_status = '4', ou caso um vencimento já tenha sido pago:
      if (titulo.id_status == "4" || titulo.id_status == "5") {
        const status = titulo.id_status == "4" ? "pago parcial" : "pago";
        throw new Error(
          `Alteração rejeitada pois o título já consta como ${status}!`
        );
      }
      const [vencimentosPagos] = await conn.execute(
        `SELECT id FROM fin_cp_titulos_vencimentos WHERE id_titulo = ? AND NOT data_pagamento IS NULL`,
        [id_titulo]
      );
      if (vencimentosPagos && vencimentosPagos.length > 0) {
        throw new Error("Título possui vencimento(s) pago(s)");
      }

      if (titulo.id_status == "2") {
        //* O título constava como Negado, então agora que o status será alterado, devemos Ativar os registros de consumo:
        await conn.execute(
          `UPDATE fin_orcamento_consumo foc SET foc.active = true
        WHERE foc.id_item_rateio
      IN(
        SELECT tr.id
            FROM fin_cp_titulos_rateio tr
            WHERE tr.id_titulo = ?
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
          `UPDATE fin_orcamento_consumo foc SET foc.active = false
        WHERE foc.id_item_rateio
      IN(
        SELECT tr.id
            FROM fin_cp_titulos_rateio tr
            WHERE tr.id_titulo = ?
        )`,
          [id_titulo]
        );
      }

      // !: Caso Diferente de Aprovado e Pago - Remover de Borderô
      if (
        id_novo_status != "3" &&
        id_novo_status != "4" &&
        id_novo_status != "5"
      ) {
        await conn.execute(
          `DELETE FROM fin_cp_titulos_borderos WHERE id_vencimento IN( 
          SELECT tv.id FROM fin_cp_titulos_vencimentos tv WHERE tv.id_titulo = ?)`,
          [id_titulo]
        );
      }

      let historico = ``;
      let author = normalizeFirstAndLastName(user?.nome);
      let textoMotivo = motivo
        ? ` MOTIVO: ${conn.escape(motivo)?.toUpperCase()} `
        : "";

      if (id_novo_status == "0") {
        historico = `ARQUIVADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "1") {
        historico = `RETORNADO PARA SOLICITADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "2") {
        historico = `NEGADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "3") {
        historico = `APROVADO POR: ${author}.`;
      }
      if (id_novo_status == "4") {
        historico = `PAGO PARCIAL POR: ${author}.`;
      }
      if (id_novo_status == "5") {
        historico = `PAGO POR: ${author}.`;
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
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "CHANGE_STATUS_TITULO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// * ok
function changeFieldTitulos(req) {
  return new Promise(async (resolve, reject) => {
    const { type, value, ids } = req.body;

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
      const result = [];
      for (const id of ids) {
        if (type === "status") {
          try {
            await changeStatusTitulo({
              body: {
                id_titulo: id,
                id_novo_status: value,
              },
            });
            result.push({ id: id, resultado: "Alterado", message: "OK" });
          } catch (error) {
            result.push({ id: id, resultado: "Erro", message: error.message });
          }
        }
      }

      resolve(result);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "CHANGE_FIELD_TITULOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    }
  });
}

function changeRecorrencia(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { data_vencimento, valor } = req.body;

    const conn = await db.getConnection();

    await conn.beginTransaction();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!data_vencimento) {
        throw new Error("DATA DE VENCIMENTO não informada!");
      }

      await conn.execute(
        `UPDATE fin_cp_titulos_recorrencias SET data_vencimento = ?, valor = ? WHERE id = ? LIMIT 1`,
        [new Date(data_vencimento), valor, id]
      );

      await conn.commit();
      resolve(true);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "UPDATE_RECORRENCIA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function downloadAnexos(req, res) {
  return new Promise(async (resolve, reject) => {
    const { type, idSelection } = req.body || {};
    const conn = await db.getConnection();
    try {
      if (!(idSelection && idSelection.length)) {
        throw new Error("SOLICITAÇÕES não selecionadas!");
      }
      const tipos_anexos = [
        { name: "url_boleto", acronym: "BO", zipName: "Boletos.zip" },
        { name: "url_nota_fiscal", acronym: "NF", zipName: "NotasFiscais.zip" },
        { name: "url_contrato", acronym: "CT", zipName: "Contratos.zip" },
        { name: "url_txt", acronym: "TX", zipName: "Textos.zip" },
        { name: "url_planilha", acronym: "PL", zipName: "Planilhas.zip" },
      ];
      if (!tipos_anexos.map((tipo) => tipo.name).includes(type)) {
        throw new Error("Tipo de anexo desconhecido!");
      }

      const titulos = [];
      for (const id_titulo of idSelection) {
        const [rowTitulo] = await conn.execute(
          `SELECT ${type} FROM fin_cp_titulos WHERE id = ?`,
          [id_titulo]
        );
        const tituloBanco = rowTitulo && rowTitulo[0];
        const ext = path.extname(tituloBanco[type]);
        const titulo = {
          type: "file",
          fileName: `${
            tipos_anexos.find((tipo) => tipo.name == type).acronym
          } - ${id_titulo}${ext}`,
          content: createUploadsPath(tituloBanco[type]),
        };
        titulos.push(titulo);
      }

      if (!titulos.filter((item) => item.content).length) {
        throw new Error("Nenhum anexo encontrado!");
      }

      // console.log(titulos.filter((item) => item.content));

      const filename = tipos_anexos.find((tipo) => tipo.name == type).zipName;
      const zip = await zipFiles({
        items: titulos.filter((item) => item.content),
      });
      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send({ zip, filename });
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "DOWNLOAD_ANEXOS_TITULO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    } finally {
      conn.release();
    }
  });
}

function exportDatasys(req) {
  return new Promise(async (resolve, reject) => {
    const { filters } = req.query || {};
    const conn = await db.getConnection();
    const { data_pagamento, id_grupo_economico } = filters;
    try {
      if (!data_pagamento) {
        throw new Error("DATA PAGAMENTO não selecionada!");
      }
      if (!id_grupo_economico) {
        throw new Error("GRUPO ECONÔMICO não selecionada!");
      }

      // ^ Consultando vencimentos de acordo com o grupo econômico e da data de pagamento
      const [vencimentos] = await conn.execute(
        `
        SELECT 
          t.id as id_titulo, tv.id, tv.data_pagamento,
          t.data_emissao as emissao, tv.data_vencimento as vencimento,
          tv.valor_pago as valor,
          t.descricao as historico,
          tv.cod_barras as bar_code,
          f.cnpj as cnpj_loja,
          fp.forma_pagamento as tipo_documento,
          fo.cnpj as cnpj_fornecedor, fo.nome as nome_fornecedor
        FROM fin_cp_titulos t 
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
        LEFT JOIN fin_fornecedores fo ON fo.id = t.id_fornecedor
        WHERE tv.data_pagamento = ?
        AND f.id_grupo_economico = ?
        `,
        [formatDate(data_pagamento, "yyyy-MM-dd"), id_grupo_economico]
      );
      const datasys = [];
      for (const vencimento of vencimentos) {
        // ^ Itereando sobre cada vencimento e pegando o valor de rateio referente
        const [rateios] = await conn.execute(
          `
          SELECT 
            tr.percentual,
            cc.nome as centro_custo, cc.id as id_centro_custo,
            pc.codigo as plano_contas, pc.id as id_plano_contas,
            f.cnpj as cnpj_rateio,
            cb.descricao as banco_pg
          FROM fin_cp_titulos_vencimentos tv
          LEFT JOIN fin_cp_titulos_rateio tr ON tr.id_titulo = tv.id_titulo 
          LEFT JOIN fin_centros_custo cc ON cc.id = tr.id_centro_custo 
          LEFT JOIN fin_plano_contas pc ON pc.id = tr.id_plano_conta
          LEFT JOIN filiais f ON f.id = tr.id_filial 
          LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
          LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
          LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
          WHERE tv.id = ?
          ORDER BY tr.id DESC
        `,
          [vencimento.id]
        );

        //^ Map para a criação do documento e Map para o armazenamento dos valores
        const map = new Map();
        const valoresMap = new Map();
        let autoIncrement = 1;
        let documento = "";

        for (const rateio of rateios) {
          const valorRateio =
            parseFloat(vencimento.valor) * parseFloat(rateio.percentual);
          // ^ Criando a chave para agrupar os rateios por centro de custo e plano de contas
          const chave = `${rateio.id_centro_custo}-${rateio.id_plano_contas}-${vencimento.id}`;

          // ^ Verifica se a chave já foi criada, para adicionar o autoincremento no documento, se não, criar e adicionar ao map
          if (map.has(chave)) {
            documento = map.get(chave);
          } else {
            documento = `${vencimento.id_titulo}.${vencimento.id}.${autoIncrement}`;
            map.set(chave, documento);
            autoIncrement++;
          }

          // ^ Verificando se o documento já foi criado, para adicionar ao autoincremento, se não, criando e adicionando ao map
          if (valoresMap.has(documento)) {
            valoresMap.set(
              documento,
              parseFloat(valoresMap.get(documento)) + valorRateio
            );
          } else {
            valoresMap.set(documento, valorRateio);
          }

          datasys.push({
            "CNPJ LOJA": vencimento.cnpj_loja,
            "CPF / CNPJ FORNECEDOR": vencimento.cnpj_fornecedor,
            DOCUMENTO: documento,
            EMISSÃO: formatDate(vencimento.emissao.toString(), "dd/MM/yyyy"),
            VENCIMENTO: formatDate(
              vencimento.vencimento.toString(),
              "dd/MM/yyyy"
            ),
            VALOR: valorRateio.toFixed(2),
            "TIPO DOCUMENTO":
              vencimento.tipo_documento &&
              vencimento.tipo_documento.toUpperCase(),
            HISTÓRICO: vencimento.historico.toUpperCase(),
            BARCODE: vencimento.bar_code,
            "CENTRO DE CUSTOS":
              rateio.centro_custo && rateio.centro_custo.toUpperCase(),
            "PLANO DE CONTAS": rateio.plano_contas,
            "CNPJ RATEIO": rateio.cnpj_rateio,
            "VALOR RATEIO": valorRateio.toFixed(2),
            "BANCO PG": rateio.banco_pg && rateio.banco_pg.toUpperCase(),
            "DATA PG": formatDate(
              vencimento.data_pagamento.toString(),
              "dd/MM/yyyy"
            ),
            "NOME FORNECEDOR":
              vencimento.nome_fornecedor &&
              vencimento.nome_fornecedor.toUpperCase(),
            PERCENTUAL: parseFloat(rateio.percentual),
          });
        }

        // ^ Adicionando o valor total dos rateios ao documento, usando os valores do map gerado anteriormente
        for (const linha of datasys) {
          if (valoresMap.has(linha.DOCUMENTO)) {
            linha.VALOR = valoresMap.get(linha.DOCUMENTO).toFixed(2);
          }
        }
      }

      if (!datasys.length) {
        throw new Error("Nenhum título encontrado!");
      }

      resolve(datasys);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "EXPORT_DATASYS_TITULOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function deleteRecorrencia(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const conn = await db.getConnection();

    await conn.beginTransaction();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.execute(
        `DELETE FROM fin_cp_titulos_recorrencias WHERE id = ? LIMIT 1`,
        [id]
      );

      await conn.commit();
      resolve(true);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "DELETE_RECORRENCIA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getAllCpVencimentosBordero,
  getAllRecorrencias,
  getOne,
  getOneByTimParams,
  getPendencias,
  insertOne,
  insertOneRecorrencia,
  insertOneByGN,
  update,
  updateFileTitulo,
  deleteRecorrencia,
  changeStatusTitulo,
  changeFieldTitulos,
  changeRecorrencia,
  exportDatasys,
  downloadAnexos,
};
