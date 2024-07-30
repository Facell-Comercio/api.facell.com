const jwt = require("jsonwebtoken");
const { logger } = require("../../logger");
require("dotenv");

function authMiddleware(req, res, next) {
  // Verificar se o token JWT está presente nos cabeçalhos da requisição
  const authHeader = req.headers.authorization || req.headers.Authorization;

  const token = authHeader && authHeader.split(" ")[1];
  //   logger.info({
  //     module: "AUTH",
  //     origin: "USER",
  //     method: "TESTE",
  //     data: { message: JSON.stringify({ authHeader, token }) },
  //   });
  if (!token) {
    return res
      .status(401)
      .json({ message: "Token de autenticação não fornecido" });
  }

  try {
    // Verificar e decodificar o token JWT
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded.user; // Adicionar informações do usuário ao objeto de solicitação
    console.log(decoded.user);
    next();
  } catch (error) {
    console.log('Erro decoded token');
    console.log(error);
    return res.status(401).json({ message: "Token de autenticação inválido" });
  }
}

module.exports = authMiddleware;
