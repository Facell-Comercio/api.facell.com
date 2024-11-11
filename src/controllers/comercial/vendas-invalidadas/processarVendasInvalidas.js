const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { mes, ano } = req.body;
    conn = conn_externa || (await db.getConnection());
    let where = `
      WHERE 1=1
      AND fd.status_inadimplencia = 'Inadimplente'
      AND (
        fd.modalidade LIKE 'PORT%' OR
        fd.modalidade LIKE 'ATIV%' OR
        fd.modalidade LIKE 'MIGR%' OR
        fd.modalidade LIKE 'DEPEN%' OR
        fd.modalidade LIKE 'UPGR%'
      ) `;
    let whereDelete = " WHERE 1=1 AND status LIKE 'ANALISE PENDENTE'";
    const params = [];
    const paramsDelete = [];
    if (mes) {
      where += ` AND MONTH(fd.dtAtivacao) = ? `;
      params.push(mes);

      whereDelete += ` AND MONTH(ref) = ? `;
      paramsDelete.push(mes);
    }
    if (ano) {
      where += ` AND YEAR(fd.dtAtivacao) = ? `;
      params.push(ano);

      whereDelete += ` AND YEAR(ref) = ? `;
      paramsDelete.push(ano);
    }
    const [facellDocs] = await conn.execute(`SELECT * FROM facell_docs fd ${where}`, params);
    const [facellDocsFort] = await conn.execute(
      `SELECT * FROM facell_docs_fort fd ${where}`,
      params
    );

    await conn.execute(`DELETE FROM comissao_vendas_invalidas ${where}`, paramsDelete);

    const vendas_invalidas = [...facellDocs, ...facellDocsFort];

    const arrayVendas = [];
    const maxLength = 10000;

    let totalInseridos = 1;
    let totalVendas = vendas_invalidas.length;
    for (const venda of vendas_invalidas) {
      arrayVendas.push(`(
        ${db.escape(venda.dtAtivacao)},     -- REF
        ${db.escape(null)},                 -- TIPO
        ${db.escape(null)},                 -- SEGMENTO
        ${db.escape(null)},                 -- DATA VENDA
        ${db.escape(venda.pedido)},         -- PEDIDO
        ${db.escape(venda.gsm)},            -- GSM
        ${db.escape(venda.gsmProvisorio)},  -- GSM PROVISORIO
        ${db.escape(venda.imei)},           -- IMEI
        ${db.escape(venda.aparelho)},       -- APARELHO
        ${db.escape(venda.modalidade)},     -- MODALIDADE
        ${db.escape(venda.plano_ativado)},  -- PLANO
        ${db.escape(venda.cpf_cliente)},    -- CPF CLIENTE
        ${db.escape(venda.cpfVendedor)},    -- CPF VENDEDOR
        ${db.escape(null)}                  -- VALOR
        
      )`);

      if (arrayVendas.length === maxLength || totalVendas === 1) {
        const queryInsert = `
        INSERT IGNORE INTO comissao_vendas_invalidas (
          ref,
          tipo,
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
          valor
        ) VALUES
          ${arrayVendas.join(",")}
        `;
        await conn.execute(queryInsert);

        arrayVendas.length = 0;
      }
      totalInseridos++;
      totalVendas--;
    }
    await conn.execute(`INSERT INTO marketing_vendedores (nome) VALUES (?)`, [nome]);
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "INSERT_ONE_VENDEDOR",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
