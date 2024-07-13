const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = 
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
        //^ fixar um anexo salvo em uploads
        const url_contrato = ""; 
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