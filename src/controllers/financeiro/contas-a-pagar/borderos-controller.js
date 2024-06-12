const { startOfDay, formatDate } = require("date-fns");
const { db } = require("../../../../mysql");
const {
  normalizeCnpjNumber,
  removeSpecialCharactersAndAccents,
  normalizeNumberOnly,
} = require("../../../helpers/mask");
const {
  createHeaderArquivo,
  createHeaderLote,
  createSegmentoA,
  createTrailerLote,
  createTrailerArquivo,
  createSegmentoB,
} = require("../remessa/parsers/itau");
const { normalizeValue } = require("../remessa/parsers/masks");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const {
      id_conta_bancaria,
      banco,
      id_grupo_economico,
      fornecedor,
      id_titulo,
      id_vencimento,
      num_doc,
      tipo_data,
      range_data,
      id_matriz,
      termo,
    } = filters || {};
    // const { id_matriz, termo } = filters || {id_matriz: 1, termo: null}
    let where = ` WHERE 1=1 `;
    const params = [];

    if (id_conta_bancaria) {
      where += ` AND b.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }
    if (banco) {
      where += ` AND fb.nome LIKE CONCAT('%', ?, '%')`;
      params.push(banco);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ?`;
      params.push(id_grupo_economico);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (fornecedor) {
      where += ` AND ff.nome LIKE CONCAT('%',?, '%') `;
      params.push(fornecedor);
    }
    if (num_doc) {
      where += ` AND t.num_doc = ? `;
      params.push(num_doc);
    }
    if (id_titulo) {
      where += ` AND tv.id_titulo = ? `;
      params.push(id_titulo);
    }
    if (id_vencimento) {
      where += ` AND tv.id = ? `;
      params.push(id_vencimento);
    }
    if (termo) {
      where += ` AND (
                  b.id LIKE CONCAT(?,"%") OR
                  cb.descricao LIKE CONCAT("%",?,"%") OR
                  b.data_pagamento LIKE CONCAT("%",?,"%")
                ) `;
      //? Realizar a normalização de data_pagamento?
      params.push(termo);
      params.push(termo);
      params.push(termo);
    }
    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND b.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND b.${tipo_data} = '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND b.${tipo_data} = '${data_ate.split("T")[0]}' `;
        }
      }
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT DISTINCT
            b.id
          FROM fin_cp_bordero b
          LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
          LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
          LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
          LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
          LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
          LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
          LEFT JOIN filiais f ON f.id = t.id_filial
          ${where}
          GROUP BY b.id

        ) AS subconsulta
        `,
        params
      );

      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      params.push(pageSize);
      params.push(offset);

      const query = `
        SELECT
          b.id, b.data_pagamento, cb.descricao as conta_bancaria, 
          t.descricao, f.id_matriz,
          (SELECT COUNT(tv.id_titulo)
            FROM fin_cp_titulos_vencimentos tv
            INNER JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
            WHERE tb.id_bordero = b.id
          ) as qtde_titulos,
          (
            SELECT SUM(tv.valor)
            FROM fin_cp_titulos_vencimentos tv
            INNER JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
            WHERE tb.id_bordero = b.id
          ) as valor_total
        FROM fin_cp_bordero b
        LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
        LEFT JOIN filiais f ON f.id = t.id_filial

        ${where}
        GROUP BY b.id
        ORDER BY b.id DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await conn.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      console.error("ERRO_BORDEROS_GET_ALL", error);
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowPlanoContas] = await conn.execute(
        `
            SELECT 
              b.id, b.data_pagamento, b.id_conta_bancaria, 
              cb.descricao as conta_bancaria, f.id_matriz, fb.nome as banco
            FROM fin_cp_bordero b
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            LEFT JOIN filiais f ON f.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            WHERE b.id = ?
            `,
        [id]
      );
      const [rowTitulos] = await conn.execute(
        `
            SELECT 
              tv.id as id_vencimento,
              tv.id_titulo, 
              t.id_status, 
              SUM(tv.valor) as valor_total, 
              SUM(tv.valor_pago) as valor_pago, 
              t.descricao, 
              t.num_doc,
              tv.data_prevista as previsao, 
              tv.data_pagamento, 
              f.nome as nome_fornecedor, 
              t.data_emissao, 
              tv.data_vencimento,
              c.nome as centro_custo,
              st.status,
              b.data_pagamento, 
              b.id_conta_bancaria, 
              f.cnpj,
              fi.nome as filial, 
              CASE WHEN (tv.data_pagamento) THEN FALSE ELSE TRUE END as can_remove,
              false AS checked
            FROM fin_cp_bordero b
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_cp_titulos_rateio tr ON tr.id_titulo = tv.id_titulo
            LEFT JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            LEFT JOIN filiais fi ON fi.id = t.id_filial
            LEFT JOIN fin_centros_custo c ON c.id = tr.id_centro_custo
            WHERE b.id = ?
            GROUP BY tv.id
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];

      const objResponse = {
        ...planoContas,
        vencimentos: rowTitulos,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      console.error("ERRO_BORDEROS_GET_ONE", error);
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, id_conta_bancaria, data_pagamento, vencimentos } = req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES (?, ?);`,
        [new Date(data_pagamento), id_conta_bancaria]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      // Inserir os vencimentos no borderô

      for (const vencimento of vencimentos) {
        await conn.execute(
          `INSERT INTO fin_cp_titulos_borderos (id_vencimento, id_bordero) VALUES(?,?)`,
          [vencimento.id_vencimento, newId]
        );
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      console.error("ERRO_BORDERO_INSERT", error);
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, id_conta_bancaria, data_pagamento, vencimentos } = req.body;
    // console.error(req.body)
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_conta_bancaria) {
        throw new Error("ID_CONTA_BANCARIA não informado!");
      }
      if (!data_pagamento) {
        throw new Error("DATA_PAGAMENTO não informada!");
      }

      await conn.beginTransaction();

      const [rowBordero] = await conn.execute(
        `SELECT data_pagamento FROM fin_cp_bordero WHERE id =?`,
        [id]
      );
      const bordero = rowBordero && rowBordero[0];
      if (!bordero) {
        throw new Error("Borderô inexistente!");
      }
      const data_pagamento_anterior = bordero.data_pagamento;

      // Update do bordero
      await conn.execute(
        `UPDATE fin_cp_bordero SET data_pagamento = ?, id_conta_bancaria = ? WHERE id =?`,
        [startOfDay(data_pagamento), id_conta_bancaria, id]
      );

      if (
        startOfDay(data_pagamento).toISOString() !=
        startOfDay(data_pagamento_anterior).toISOString()
      ) {
        // Update titulos do bordero igualando a data_prevista à data_pagamento do bordero
        await conn.execute(
          `
        UPDATE fin_cp_titulos_vencimentos 
        SET data_prevista = ? 
        WHERE id IN (
          SELECT id_vencimento FROM fin_cp_titulos_borderos WHERE id_bordero = ?
        )`,
          [startOfDay(data_pagamento), id]
        );
      }

      // Inserir os itens do bordero
      for (const vencimento of vencimentos) {
        await conn.execute(
          `INSERT INTO fin_cp_titulos_borderos (id_vencimento, id_bordero) VALUES(?,?)`,
          [vencimento.id_vencimento, id]
        );
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.error("ERRO_BORDEROS_UPDATE", error);
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function deleteVencimento(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();

      const [rowVencimento] = await conn.execute(
        `SELECT t.id_status, tv.data_pagamento  
        FROM fin_cp_titulos t
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        WHERE tv.id = ?`,
        [id]
      );

      if (
        rowVencimento[0].id_status === 4 ||
        !rowVencimento[0].data_pagamento
      ) {
        throw new Error("Não é possível remover do borderô vencimentos pagos!");
      }

      await conn.execute(
        `DELETE FROM fin_cp_titulos_borderos WHERE id_vencimento = ?`,
        [id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.error("ERRO_DELETE_TITULO_BORDERO", error);
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function deleteBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const vencimentos = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.beginTransaction();
      for (const vencimento of vencimentos) {
        if (vencimento.id_status === 4 || !vencimento.can_remove) {
          throw new Error(
            "Não é possível deletar um borderô com vencimentos pagos!"
          );
        }
      }

      await conn.execute(`DELETE FROM fin_cp_bordero WHERE id = ? LIMIT 1`, [
        id,
      ]);

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.error("ERRO_DELETE_BORDERO", error);
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function transferBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { id_conta_bancaria, date, vencimentos } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id_conta_bancaria) {
        throw new Error("ID_CONTA_BANCARIA novo não informado!");
      }
      if (!date) {
        throw new Error("DATA_PAGAMENTO novo não informado!");
      }
      if (vencimentos.length < 0) {
        throw new Error("VENCIMENTOS não informado!");
      }

      await conn.beginTransaction();

      const [rowBordero] = await conn.execute(
        `
          SELECT id 
          FROM fin_cp_bordero 
          WHERE data_pagamento = ?
          AND id_conta_bancaria = ?
      `,
        [new Date(date), id_conta_bancaria]
      );

      let id = (rowBordero[0] && rowBordero[0].id) || "";

      if (!id) {
        const [newBordero] = await conn.execute(
          `INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES (?, ?);`,
          [new Date(date), id_conta_bancaria]
        );
        id = newBordero.insertId;
      }

      for (const vencimento of vencimentos) {
        if (vencimento.id_status != 3) {
          throw new Error(
            "Não é possível realizar a transfência de vencimentos com status diferente de aprovado!"
          );
        }
        await conn.execute(
          `UPDATE fin_cp_titulos_borderos SET id_bordero = ? WHERE id_vencimento =  ?`,
          [id, vencimento.id_vencimento]
        );
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.error("ERRO_TRANSFER_BORDERO", error);
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function exportBorderos(req) {
  return new Promise(async (resolve, reject) => {
    const { data: borderos } = req.body;
    const vencimentosBordero = [];
    try {
      if (!borderos.length) {
        throw new Error("Quantidade inválida de de borderos!");
      }

      for (const b_id of borderos) {
        const response = await getOne({ params: { id: b_id } });
        response.vencimentos.forEach((titulo) => {
          const normalizeDate = (data) => {
            const date = new Date(data);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const formattedDay = String(day).padStart(2, "0");
            const formattedMonth = String(month).padStart(2, "0");
            return `${formattedDay}/${formattedMonth}/${year}`;
          };

          vencimentosBordero.push({
            IDPG: titulo.id_vencimento || "",
            "ID TÍTULO": titulo.id_titulo || "",
            PAGAMENTO: titulo.data_pagamento
              ? normalizeDate(titulo.data_pagamento)
              : "",
            EMISSÃO: titulo.data_emissao
              ? normalizeDate(titulo.data_emissao)
              : "",
            VENCIMENTO: titulo.data_vencimento
              ? normalizeDate(titulo.data_vencimento)
              : "",
            FILIAL: titulo.filial || "",
            "CPF/CNPJ": titulo.cnpj ? normalizeCnpjNumber(titulo.cnpj) : "",
            FORNECEDOR: titulo.nome_fornecedor || "",
            "Nº DOC": titulo.num_doc || "",
            DESCRIÇÃO: titulo.descricao || "",
            VALOR:
              parseFloat(titulo.valor_total && titulo.valor_total.toString()) ||
              "",
            "CENTRO CUSTO": titulo.centro_custo || "",

            "CONTA BANCÁRIA": response.conta_bancaria || "",
            BANCO: response.banco || "",
            PREVISÃO: normalizeDate(titulo.previsao) || "",
            STATUS: titulo.status || "",
          });
        });
      }

      resolve(vencimentosBordero);
    } catch (error) {
      console.error("ERRO_EXPORT_BORDERO", error);
      reject(error);
    }
  });
}

function exportRemessa(req, res) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();

    try {
      if (!id) {
        throw new Error("ID do Borderô não indicado!");
      }
      await conn.beginTransaction();

      const [rowsBordero] = await conn.execute(
        `
      SELECT
        f.cnpj as cnpj_empresa,
        cb.agencia, cb.dv_agencia, cb.conta, cb.dv_conta,
        f.razao as empresa_nome, f.logradouro as endereco_empresa,
        f.numero as endereco_num, f.complemento as endereco_compl,
        f.municipio as cidade, f.cep, f.uf,
        cb.descricao as conta_bancaria, b.data_pagamento, fb.codigo as codigo_bancario
      FROM fin_cp_bordero b
      LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
      LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
      LEFT JOIN filiais f ON f.id = cb.id_filial
      WHERE b.id = ?
    `,
        [id]
      );
      const borderoData = rowsBordero && rowsBordero[0];

      //* Verificação de permissão de geração de remessa~
      if (+borderoData.codigo_bancario !== 341) {
        throw new Error(
          "A Remessa não pode ser gerada por não ser do banco Itaú"
        );
      }

      //* Consulta das formas de pagamento *//
      // console.time("FORMA DE PAGAMENTO"); // TESTANDO PERFORMANCE
      const [
        rowsPagamentoCorrenteItau,
        rowsPagamentoPoupancaItau,
        rowsPagamentoCorrenteMesmaTitularidade,
        rowsPagamentoTEDOutroTitular,
        rowsPagamentoTEDMesmoTitular,
        rowsPagamentoPIX,
      ] = await Promise.all([
        conn
          .execute(
            `
      SELECT
        tv.id as id_vencimento
      FROM fin_cp_titulos_vencimentos tv
      LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
      LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
      LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
      LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
      LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
      LEFT JOIN filiais f ON f.id = t.id_filial
      LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      WHERE tb.id_bordero = ?
      AND t.id_forma_pagamento = 5
      AND forn.cnpj <> f.cnpj
      AND fb.codigo = 341
      AND cb.id_tipo_conta = 1
      AND tv.data_pagamento IS NULL
    `,
            [id]
          )
          .then(([rows]) => rows),
        conn
          .execute(
            `
      SELECT
        tv.id as id_vencimento
      FROM fin_cp_titulos_vencimentos tv
      LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
      LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
      LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
      LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
      LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
      LEFT JOIN filiais f ON f.id = t.id_filial
      LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      WHERE tb.id_bordero = ?
      AND t.id_forma_pagamento = 5
      AND forn.cnpj <> f.cnpj
      AND fb.codigo = 341
      AND cb.id_tipo_conta = 2
      AND tv.data_pagamento IS NULL
    `,
            [id]
          )
          .then(([rows]) => rows),
        conn
          .execute(
            `
      SELECT
        tv.id as id_vencimento
      FROM fin_cp_titulos_vencimentos tv
      LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
      LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
      LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
      LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
      LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
      LEFT JOIN filiais f ON f.id = t.id_filial
      LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      WHERE tb.id_bordero = ?
      AND t.id_forma_pagamento = 5
      AND forn.cnpj = f.cnpj
      AND fb.codigo = 341
      AND cb.id_tipo_conta = 1
      AND tv.data_pagamento IS NULL
    `,
            [id]
          )
          .then(([rows]) => rows),
        conn
          .execute(
            `
      SELECT
        tv.id as id_vencimento
      FROM fin_cp_titulos_vencimentos tv
      LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
      LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
      LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
      LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
      LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
      LEFT JOIN filiais f ON f.id = t.id_filial
      LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      WHERE tb.id_bordero = ?
      AND t.id_forma_pagamento = 5
      AND forn.cnpj <> f.cnpj
      AND fb.codigo <> 341
      AND tv.data_pagamento IS NULL
    `,
            [id]
          )
          .then(([rows]) => rows),
        conn
          .execute(
            `
      SELECT
        tv.id as id_vencimento
      FROM fin_cp_titulos_vencimentos tv
      LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
      LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
      LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
      LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
      LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
      LEFT JOIN filiais f ON f.id = t.id_filial
      LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      WHERE tb.id_bordero = ?
      AND t.id_forma_pagamento = 5
      AND forn.cnpj = f.cnpj
      AND fb.codigo <> 341
      AND tv.data_pagamento IS NULL
    `,
            [id]
          )
          .then(([rows]) => rows),
        conn
          .execute(
            `
      SELECT
        tv.id as id_vencimento
      FROM fin_cp_titulos_vencimentos tv
      LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
      LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
      LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
      LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
      LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
      LEFT JOIN filiais f ON f.id = t.id_filial
      LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      WHERE tb.id_bordero = ?
      AND t.id_forma_pagamento = 4
      AND tv.data_pagamento IS NULL
    `,
            [id]
          )
          .then(([rows]) => rows),
      ]);

      const formasPagamento = new Map(
        Object.entries({
          PagamentoCorrenteItau: rowsPagamentoCorrenteItau,
          PagamentoPoupancaItau: rowsPagamentoPoupancaItau,
          PagamentoCorrenteMesmaTitularidade:
            rowsPagamentoCorrenteMesmaTitularidade,
          PagamentoTEDOutroTitular: rowsPagamentoTEDOutroTitular,
          PagamentoTEDMesmoTitular: rowsPagamentoTEDMesmoTitular,
          PagamentoPIX: rowsPagamentoPIX,
        })
      );

      // console.timeEnd("FORMA DE PAGAMENTO");// TESTANDO PERFORMANCE
      const arquivo = [];

      let lote = 0;
      let qtde_registros = 0;
      let qtde_registros_arquivo = 0;
      const dataCriacao = new Date();
      const headerArquivo = createHeaderArquivo({
        ...borderoData,
        arquivo_data_geracao: formatDate(dataCriacao, "ddMMyyyy"),
        arquivo_hora_geracao: formatDate(dataCriacao, "hhmmss"),
      });
      arquivo.push(headerArquivo);
      qtde_registros_arquivo++;

      for (const [key, formaPagamento] of formasPagamento) {
        if (!formaPagamento.length) continue;
        ++lote;

        let somatoria_valores = 0;
        let forma_pagamento = 6;
        switch (key) {
          case "PagamentoCorrenteItau":
            forma_pagamento = 1;
            break;
          case "PagamentoPoupancaItau":
            forma_pagamento = 5;
            break;
          case "PagamentoCorrenteMesmaTitularidade":
            forma_pagamento = 6;
            break;
          case "PagamentoTEDOutroTitular":
            forma_pagamento = 41;
            break;
          case "rowsPagamentoTEDMesmoTitular":
            forma_pagamento = 43;
            break;
          case "PagamentoPIX":
            forma_pagamento = 45;
            break;
        }
        const headerLote = createHeaderLote({
          ...borderoData,
          lote,
          forma_pagamento,
        });
        arquivo.push(headerLote);
        qtde_registros++;
        qtde_registros_arquivo++;

        // formaPagamento.shift(); //! Retirar isso dps
        let registroLote = 1;
        for (const pagamento of formaPagamento) {
          const [rowVencimento] = await conn.execute(
            `
          SELECT
            tv.id as doc_empresa,  
            fb.codigo as cod_banco_favorecido,
            forn.agencia,
            forn.dv_agencia,
            forn.conta,
            forn.nome as favorecido_nome,
            DATE_FORMAT(tv.data_prevista, '%d/%m/%Y') as data_pagamento,
            tv.valor as valor_pagamento,
            forn.cnpj as favorecido_cnpj,
            t.id_tipo_chave_pix,
            t.chave_pix
          FROM fin_cp_titulos t
          LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
          WHERE tv.id = ?
        `,
            [pagamento.id_vencimento]
          );
          const vencimento = rowVencimento && rowVencimento[0];

          //* Dependendo do banco o modelo muda
          let bancoFavorecido = [];
          if (vencimento.banco === 341) {
            bancoFavorecido.push(
              0,
              normalizeValue(vencimento.agencia, "numeric", 4),
              " ",
              new Array(5).fill("0").join(""),
              normalizeValue(vencimento.conta, "numeric", 6),
              " ",
              normalizeValue(vencimento.dv_agencia, "numeric", 1)
            );
          } else {
            bancoFavorecido.push(
              normalizeValue(vencimento.agencia, "numeric", 5),
              " ",
              normalizeValue(vencimento.conta, "numeric", 12),
              " ",
              normalizeValue(vencimento.dv_agencia, "alphanumeric", 1)
            );
          }
          //* Quando um pagamento é do tipo PIX Transferência o código câmara é 009 *//
          const segmentoA = createSegmentoA({
            ...vencimento,
            lote,
            num_registro_lote: registroLote,
            cod_camara: key === "PagamentoPIX" && 9,
            vencimento: vencimento.id,
            ident_transferencia: key === "PagamentoPIX" && "04", //^^ Verificar se está correto
            cod_banco_favorecido:
              key === "PagamentoPIX"
                ? new Array(3).fill(0).join("")
                : vencimento.cod_banco_favorecido,
          });
          arquivo.push(segmentoA);
          qtde_registros++;
          qtde_registros_arquivo++;
          somatoria_valores += parseFloat(vencimento.valor_pagamento);

          registroLote++;

          let tipo_chave = "00";
          let chave_pix = vencimento.chave_pix;
          if (key === "PagamentoPIX") {
            switch (vencimento.id_tipo_chave_pix) {
              case 1:
                // Aleatória
                tipo_chave = "04";
                break;
              case 2:
                // E-mail
                tipo_chave = "02";
                break;
              case 3:
                // Celular
                tipo_chave = "01";
                chave_pix = "+55" + normalizeNumberOnly(chave_pix);
                break;
              case 4:
                // CPF
                tipo_chave = "03";
                chave_pix = normalizeNumberOnly(chave_pix);
                break;
              case 5:
                // CNPJ
                tipo_chave = "03";
                chave_pix = normalizeNumberOnly(chave_pix);
                break;
            }

            const segmentoB = createSegmentoB({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              tipo_chave,
              num_inscricao: vencimento.favorecido_cnpj,
              txid: vencimento.id,
              chave_pix,
            });
            arquivo.push(segmentoB);
            qtde_registros_arquivo++;
          }
        }

        qtde_registros++;
        qtde_registros_arquivo++;
        const trailerLote = createTrailerLote({
          ...borderoData,
          lote,
          qtde_registros,
          somatoria_valores: somatoria_valores.toFixed(2).replace(".", ""),
        });

        arquivo.push(trailerLote);
      }

      qtde_registros_arquivo++;
      const trailerArquivo = createTrailerArquivo({
        qtde_lotes: lote,
        qtde_registros_arquivo,
      });
      arquivo.push(trailerArquivo);

      //* Verificação da quantidade de lotes
      if (arquivo.length < 3) {
        throw new Error("Não há lotes gerados");
      }

      const fileBuffer = Buffer.from(arquivo.join("\r\n") + "\r\n", "utf-8");
      const filename = `REMESSA - ${formatDate(
        borderoData.data_pagamento,
        "dd_MM_yyyy"
      )} - ${removeSpecialCharactersAndAccents(
        borderoData.conta_bancaria
      )}.txt`.toUpperCase();
      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(fileBuffer);
      await conn.commit();
      resolve();
    } catch (error) {
      await conn.rollback();
      console.error("ERRO_EXPORT_REMESSA", error);
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function geradorDadosEmpresa() {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const [rowsFiliais] = await conn.execute(
        `
        SELECT
          id, cnpj
        FROM filiais 
      `
      );
      for (const filial of rowsFiliais) {
        await fetch(`https://receitaws.com.br/v1/cnpj/${filial.cnpj}`)
          .then((res) => res.json())
          .then(async (data) => {
            // console.log("FILIAL - ", filial.id, " - OK");

            await conn.execute(
              `
              UPDATE filiais SET logradouro = ?, numero = ?, complemento = ?, cep = ?, email = ? WHERE id = ?
              `,
              [
                data.logradouro,
                data.numero,
                data.complemento,
                data.cep.split("/")[0].replace(/\D/g, ""),
                data.email,
                filial.id,
              ]
            );
          })
          .catch((error) => {
            console.error("ERRO_CONSULTA_CNPJ_BORDEROS", error);
            reject(error);
          });
        await new Promise((resolve) => setTimeout(resolve, 20000));
        console.log("20 seconds have passed!");
      }

      await conn.commit();
      resolve();
    } catch (error) {
      console.error("ERRO_EXPORT_REMESSA", error);
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  deleteVencimento,
  deleteBordero,
  transferBordero,
  exportBorderos,
  exportRemessa,
  geradorDadosEmpresa,
};
