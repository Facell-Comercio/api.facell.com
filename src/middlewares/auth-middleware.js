const jwt = require("jsonwebtoken");
require("dotenv");

function authMiddleware(req, res, next) {
  // Verificar se o token JWT está presente nos cabeçalhos da requisição
  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log(authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  console.log(token);
  if (!token) {
    return res
      .status(401)
      .json({ message: "Token de autenticação não fornecido" });
  }

  try {
    // Verificar e decodificar o token JWT
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded.user; // Adicionar informações do usuário ao objeto de solicitação
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token de autenticação inválido" });
  }
}

module.exports = authMiddleware;
