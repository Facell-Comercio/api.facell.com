const xml2js = require('xml2js');
const axios = require('axios');
const { ENDPOINT, CONFIG } = require('../config');
require('dotenv').config();

module.exports = async (grupo_economico)=> {
  const token = grupo_economico === 'FACELL' ? process.env.TOKEN_DATASYS : process.env.TOKEN_DATASYS_FORT;

  const SOAPENVELOPE = `
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        <BaixarEstoque xmlns="http://tempuri.org/">
          <Token>${token}</Token>
        </BaixarEstoque>
      </soap12:Body>
    </soap12:Envelope>`;

  try {
    const response = await axios.post(ENDPOINT, SOAPENVELOPE, CONFIG);
    const parser = new xml2js.Parser();

    const parsedResult = await parser.parseStringPromise(response.data);
    const soapEnvelope = parsedResult['soap:Envelope'];
    const soapBody = soapEnvelope?.['soap:Body']?.[0];
    const baixarEstoqueResponse = soapBody?.['BaixarEstoqueResponse']?.[0];
    const baixarEstoqueResult = baixarEstoqueResponse?.['BaixarEstoqueResult']?.[0];
    const newDataSet = baixarEstoqueResult?.['NewDataSet']?.[0];
    const table = newDataSet?.['Table'];

    if (!table) {
      throw new Error('Propriedade "Table" não encontrada');
    }

    return table;
  } catch (error) {
    logger.error({
      module: 'DATASYS', origin: 'API', method: 'BAIXAR_ESTOQUE',
      data: {message: error.message, stack: error.stack, name: error.name}
    })
    throw error;
  }
};