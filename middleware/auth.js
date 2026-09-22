const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado. No hay token proporcionado.' });
  }

  try {
    // Si viene como "Bearer token", reemplazamos "Bearer "
    const cleanToken = token.replace('Bearer ', '');
    const verificado = jwt.verify(cleanToken, process.env.JWT_SECRET);
    
    // Inyectamos los datos del usuario decodificado en la request
    req.usuario = verificado;
    next();
  } catch (error) {
    res.status(400).json({ mensaje: 'Token inválido o expirado.' });
  }
};

module.exports = auth;
