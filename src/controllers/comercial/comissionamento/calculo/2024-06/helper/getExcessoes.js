const [rowsExcecoes] = await conn.execute(
    `SELECT descr, valor FROM comissao_excecoes
   WHERE ref = ? and cpf = ? and filial = ? and cargo = ? `,
    [ref, espelho.cpf, espelho.filial, espelho.cargo]
  );

  const getExcecoes = ()=>{
    
  }

  module.exports = getExcecoes