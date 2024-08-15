const checkTipoRegistroRemessa = (linha) => {
  return linha?.substring(7, 8);
};
const checkIsPixByLoteRemessa = (linha) => {
  //* Verifica se a forma de pagamento é referente a PIX
  return linha?.substring(11, 13) == 45 || linha?.substring(11, 13) == 47;
};
const checkTipoSegmentoDetalhe = (linha, isPix) => {
  const letra = linha?.substring(13, 14);
  const cod_registro = linha?.substring(17, 19);
  // console.log({letra, cod_registro})
  let result = letra;

  if (letra === "J") {
    // todo: verificar se é 52
    if (cod_registro == 52) {
      result += "-52";
      // todo: verificar se é Pix
      if (isPix) {
        result += "-PIX";
      }
    }
  }
  return result;
};

const transformStringToObject = (layout, string) => {
  const obj = {};
  layout.forEach((campo) => {
    let valor = string.substring(campo.startPos - 1, campo.endPos);
    let valorFormatado = formatarCampoRemessa({
      valor,
      type: campo.type,
      format: campo.format,
    });
    obj[campo.field] = valorFormatado;
  });
  return obj;
};

function formatarCampoRemessa({ valor, type, format }) {
  if (format === "float") {
    return parseFloat((parseInt(valor) / 100).toFixed(2));
  }
  if (type === "date" && format === "mmyyyy") {
    let mes = parseInt(valor.substring(0, 2));
    let ano = parseInt(valor.substring(2, 6));
    return new Date(ano, mes - 1, 1);
  }
  if (type === "date") {
    let dia = parseInt(valor.substring(0, 2));
    let mes = parseInt(valor.substring(2, 4));
    let ano = parseInt(valor.substring(4, 8));
    return new Date(ano, mes - 1, dia);
  }
  if (type === "alphanumeric") {
    return valor.trim() || null;
  }
  if (type === "numeric") {
    let valorFormatado = parseInt(valor.trim());
    return valorFormatado === 0 || !valorFormatado ? null : valorFormatado;
  }
  return valor;
}

module.exports = {
  checkTipoRegistroRemessa,
  checkIsPixByLoteRemessa,
  transformStringToObject,
  checkTipoSegmentoDetalhe,
};
