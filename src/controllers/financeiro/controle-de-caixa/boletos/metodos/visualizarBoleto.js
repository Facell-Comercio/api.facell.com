const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const Boleto = require('../../../../../services/boleto').Boleto;

module.exports = async (req, res) => {
    const { id } = req.query;
    let conn;
    try {
        conn = await db.getConnection();
        const bancos_validos = [
            { codigo: '237', nome: 'bradesco' },
            { codigo: '033', nome: 'santander' },
            { codigo: '341', nome: 'itau' },
        ]
        const status_validos = ['emitido', 'atrasado', 'em_pagamento', 'pago']

        const [rowsBoletos] = await conn.execute(
            `SELECT 
            boleto.id,
            boleto.valor,
            LPAD(nosso_numero, 8, '0') as nosso_numero,
            boleto.documento,
            boleto.data_emissao,
            boleto.data_vencimento, 
            boleto.num_carteira,
            CASE WHEN boleto.status = "emitido" AND boleto.data_vencimento < CURDATE() THEN "atrasado" ELSE boleto.status END as status,
            f.razao as razao_social,
            f.cnpj as cnpj_filial,
            RIGHT(LPAD(cb.agencia, 4), 4) as agencia_bancaria,
            CAST(cb.conta AS INT) AS conta_bancaria,
            CAST(cb.dv_conta AS INT) AS dv_conta_bancaria,
            banco.codigo as codigo_banco

        FROM datasys_caixas_boletos boleto
        LEFT JOIN filiais f ON f.id = boleto.id_filial
        LEFT JOIN fin_contas_bancarias cb ON cb.id = boleto.id_conta_bancaria
        LEFT JOIN fin_bancos banco ON banco.id = cb.id_banco
        WHERE boleto.id = ?
        `,
            [id]
        );
        const dadosBoleto = rowsBoletos && rowsBoletos[0];
        if (!dadosBoleto) {
            throw new Error('Boleto não localizado!')
        }

        if (!status_validos.includes(dadosBoleto.status)) {
            throw new Error(`Boleto ${dadosBoleto.status.toUpperCase()}, não é possível visualizar!`)
        }

        const banco = bancos_validos.find(bv => bv.codigo == dadosBoleto.codigo_banco)
        if (!banco) {
            throw new Error(`Banco de código ${dadosBoleto.codigo_banco}, não permitido para visualização!`)
        }

        let nome_banco = banco.nome;
        let data_emissao = dadosBoleto.data_emissao
        let data_vencimento = dadosBoleto.data_vencimento
        let valor = parseInt(parseFloat(dadosBoleto.valor) * 100)
        let carteira = parseInt(dadosBoleto.num_carteira)
        let nosso_numero = dadosBoleto.nosso_numero
        let numero_documento = dadosBoleto.documento
        let cedente = dadosBoleto.razao_social
        let cedente_cnpj = dadosBoleto.cnpj_filial
        let agencia = dadosBoleto.agencia_bancaria
        let codigo_cedente = `${dadosBoleto.conta_bancaria}${dadosBoleto.dv_conta_bancaria || 0}`

        // console.log({
        //     nome_banco,
        //     data_emissao,
        //     data_vencimento,
        //     valor,
        //     nosso_numero,
        //     numero_documento,
        //     cedente,
        //     cedente_cnpj,
        //     agencia,
        //     codigo_cedente,
        //     carteira,
        // });

        let boleto = new Boleto({
            'banco': nome_banco, // nome do banco dentro da pasta 'banks'
            'data_emissao': data_emissao,
            'data_vencimento': data_vencimento, // 5 dias futuramente
            'valor': valor, // R$ 15,00 (valor em centavos) fica 1500
            'nosso_numero': nosso_numero, // Nosso número no boleto
            'numero_documento': numero_documento, // Número de documento no boleto
            'cedente': cedente, // Razão social
            'cedente_cnpj': cedente_cnpj, // sem pontos e traços
            'agencia': agencia, // 4 dígitos
            'codigo_cedente': codigo_cedente, // conta bancária + dv_conta
            'carteira': carteira // Código carteia 109 exemplo
        });

        boleto.renderHTML(function (html) {
            res.send(html);
        })

    } catch (error) {
        res.status(400).send(error.message)
        logger.error({
            module: "FINANCEIRO",
            origin: "CONFERENCIA_DE_CAIXA",
            method: "VISUALIZAR_BOLETO",
            data: { message: error.message, stack: error.stack, name: error.name },
        });
    } finally {
        if (conn) conn.release();
    }
};
