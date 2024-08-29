const zlib = require("zlib");
const jwt = require("jsonwebtoken");
const { logger } = require("../../logger");
require("dotenv");

function authMiddleware(req, res, next) {
  // Verificar se o token JWT está presente nos cabeçalhos da requisição
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization;
  const compressedToken =
    authHeader && authHeader.split(" ")[1];

  //^ Realiza a descompressão do token
  const token = zlib
    .gunzipSync(
      Buffer.from(compressedToken, "base64")
    )
    .toString();
  // console.log("DESCOMPRIMIDO", token.length);

  if (!token) {
    return res.status(401).json({
      message:
        "Token de autenticação não fornecido",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.SECRET
    );

    req.user = decoded.user; // Adicionar informações do usuário ao objeto de solicitação
    next();
  } catch (error) {
    // console.log('Erro decoded token');
    // console.log(error);
    return res.status(401).json({
      message: "Token de autenticação inválido",
    });
  }
}

module.exports = authMiddleware;
