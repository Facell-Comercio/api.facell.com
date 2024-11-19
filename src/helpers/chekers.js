function checkCodigoBarras(text) {
  if (!text) {
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
  digitoVerificador =
    digitoVerificador == 11 || digitoVerificador == 10 || digitoVerificador == 0
      ? 1
      : digitoVerificador;
  // console.log(somaDigitos, modulo, digitoVerificador, dv);
  return digitoVerificador === parseInt(dv);
}

function checkEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

function checkCPF(cpf) {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]+/g, "");

  // Verifica se o CPF tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Valida o primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  // Valida o segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
}

module.exports = {
  checkCodigoBarras,
  checkEmail,
  checkCPF,
};
