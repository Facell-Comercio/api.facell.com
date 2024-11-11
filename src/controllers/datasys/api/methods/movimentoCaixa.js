const xml2js = require('xml2js');
const axios = require('axios');
const { logger } = require("../../../../../logger");
const { ENDPOINT, CONFIG } = require('../config');

module.exports = async ({ cnpj, data, grupo_economico }) => {
  const token = grupo_economico === 'FACELL'
    ? process.env.TOKEN_DATASYS
    : process.env.TOKEN_DATASYS_FORT;

  const SOAPENVELOPE = `
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        <MovimentoCaixa xmlns="http://tempuri.org/">
          <Token>${token}</Token>
          <CNPJ>${cnpj}</CNPJ>
          <TipoLancamento>TODOS</TipoLancamento>
          <DataMovimento>${data}</DataMovimento>
        </MovimentoCaixa>
      </soap12:Body>
    </soap12:Envelope>`;

  try {
    const response = await axios.post(ENDPOINT, SOAPENVELOPE, CONFIG);
    const parser = new xml2js.Parser({explicitArray: false});

    const parsedResult = await parser.parseStringPromise(response.data);
    const soapEnvelope = parsedResult['soap:Envelope'];
    const soapBody = soapEnvelope?.['soap:Body'];
    const MovimentoCaixaResponse = soapBody?.['MovimentoCaixaResponse'];
    const MovimentoCaixaResult = MovimentoCaixaResponse?.['MovimentoCaixaResult'];
    const newDataSet = MovimentoCaixaResult?.['NewDataSet'];
    const table = newDataSet?.['Table'] || [];
  
    return table;
  } catch (error) {
    logger.error({
      module: 'DATASYS', origin: 'API', method: 'MOVIMENTO_CAIXA',
      data: { message: error.message, stack: error.stack, name: error.name }
    })
    throw error;
  }
}