const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const getOneCampanha = require("./getOneCampanha");
const XLSX = require("xlsx");
const { formatDate } = require("date-fns");

module.exports = async (req, res) => {
  const { user } = req;
  if (!user) {
    reject("Usuário não autenticado!");
    return false;
  }
  // Filtros
  const { id_campanha, filters, type } = req.query;

  let conn;

  try {
    conn = await db.getConnection();

    //* CONSULTANDO A CAMPANHA DE ACORDO COM OS FILTROS
    const campanha = await getOneCampanha({
      params: { id: id_campanha },
      body: {
        filters: { ...filters, isExportacao: true },
        conn_externa: conn,
      },
    });
    console.log(campanha.nome);

    const { clientes } = campanha;

    const result = [];
    for (const cliente of clientes) {
      const obj = {
        id: "",
        external_id: cliente.id,
        name: cliente.nome,
        status: cliente.status_plano,
        outcome: "",
        number1: cliente.gsm,
        comments: "",
        CONSULTORA: cliente.vendedor,
        DESCONTO_OFERTA: cliente.desconto,
        APARELHO_OFERTADO: cliente.produto_ofertado,
        VALOR_PRE: cliente.valor_pre,
        VALOR_COM_DESCONTO: cliente.valor_plano,
        PLANO_ATUAL: cliente.plano_atual,
        FIDELIZADO_COM_APARELHO: cliente.produto_fidelizado ? "Sim" : "Não",
        APARELHO_DA_ULTIMA_COMPRA: cliente.produto_ultima_compra,
        DATA_DA_ULTIMA_COMPRA: cliente.data_ultima_compra,
        CPF_DO_CLIENTE: `'${cliente.cpf}'`,
        LOJA_DA_ULTIMA_COMPRA: cliente.filial,
        LINK_WHATSAPP: `https://wa.me/55${cliente.gsm}`,
        GSM_DO_CLIENTE: cliente.gsm,
      };
      result.push(obj);
    }

    // Geração do worksheet a partir dos dados de SUBCAMPANHA EVOLUX
    const worksheet = XLSX.utils.json_to_sheet(result);

    if (type === "xlsx") {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      const filename = `EXPORTACAO ${campanha.nome.toUpperCase()} EVOLUX ${formatDate(
        new Date(),
        "dd-MM-yyyy hh.mm"
      )}.xlsx`;

      res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.set("Content-Disposition", `attachment; filename=${filename}`);

      res.send(buffer);
    } else if (type === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      const filename = `EXPORTACAO ${campanha.nome.toUpperCase()} EVOLUX ${formatDate(
        new Date(),
        "dd-MM-yyyy hh.mm"
      )}.csv`;

      // Define os cabeçalhos para CSV, sem especificar o charset
      res.set("Content-Type", "text/csv");
      res.set("Content-Disposition", `attachment; filename=${filename}`);

      // Envia o CSV diretamente, convertendo para buffer
      res.send(Buffer.from(csv, "latin1")); // Usando latin1 para evitar UTF-8
    } else {
      throw new Error("Tipo de importação inválida");
    }
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "EXPORT_SUBCAMPANHA",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
