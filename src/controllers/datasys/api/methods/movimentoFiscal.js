const xml2js = require('xml2js');
const axios = require('axios');
const { logger } = require("../../../../../logger");
const { ENDPOINT, CONFIG } = require('../config');

module.exports = async ({ cnpj, dataInicial, dataFinal, grupo_economico }) => {
  const token = grupo_economico === 'FACELL' ? process.env.TOKEN_DATASYS : process.env.TOKEN_DATASYS_FORT;

  const SOAPENVELOPE = `
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        <ExportaMovimentoFiscal xmlns="http://tempuri.org/">
          <Token>${token}</Token>
          <stCNPJ>${cnpj}</stCNPJ>
          <stInicio>${dataInicial}</stInicio>
          <stFim>${dataFinal}</stFim>
        </ExportaMovimentoFiscal>
      </soap12:Body>
    </soap12:Envelope>`;

  try {
    const response = await axios.post(ENDPOINT, SOAPENVELOPE, CONFIG);
    const parser = new xml2js.Parser();

    const parsedResult = await parser.parseStringPromise(response.data);
    const soapEnvelope = parsedResult['soap:Envelope'];
    const soapBody = soapEnvelope?.['soap:Body']?.[0];
    const exportaMovimentoFiscalResponse = soapBody?.['ExportaMovimentoFiscalResponse']?.[0];
    const exportaMovimentoFiscalResult = exportaMovimentoFiscalResponse?.['ExportaMovimentoFiscalResult']?.[0];
    const loja = exportaMovimentoFiscalResult?.['Loja']?.[0];
    const nf = loja?.['NF'];

    if (!nf) {
      throw new Error('Propriedade "NF" não encontrada');
    }

    return nf;
  } catch (error) {
    logger.error({
      module: 'DATASYS', origin: 'API', method: 'BAIXAR_MOVIMENTO_FISCAL',
      data: { message: error.message, stack: error.stack, name: error.name }
    })
    throw error;
  }
};