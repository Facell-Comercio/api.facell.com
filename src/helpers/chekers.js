function checkCodigoBarras(text) {
  if(!text){
    return false;
  }
  const dv = String(text)?.charAt(4);
  const linhaCheck = `${text.substring(0, 4)}${text.substring(5, 47)}`;
  // console.log(text.substring(0, 4));
  // console.log(text.substring(4, 47));
  const linhaCalculo = "4329876543298765432987654329876543298765432";
  let somaDigitos = 0;
  const arrayCheck = Array.from(linhaCheck);
  const arrayCalculo = Array.from(linhaCalculo);
  for (const i in arrayCheck) {
    // console.log(
    //   arrayCheck[i],
    //   arrayCalculo[i],
    //   parseInt(arrayCheck[i]) * parseInt(arrayCalculo[i])
    // );
    somaDigitos += parseInt(arrayCheck[i]) * parseInt(arrayCalculo[i]);
  }
  const modulo = somaDigitos % 11;
  let digitoVerificador = 11 - modulo;
  digitoVerificador = (digitoVerificador == 11 || digitoVerificador == 10 || digitoVerificador == 0) ? 1 : digitoVerificador;
  // console.log(somaDigitos, modulo, digitoVerificador, dv);
  return digitoVerificador === parseInt(dv);
}

module.exports = {
  checkCodigoBarras,
};
