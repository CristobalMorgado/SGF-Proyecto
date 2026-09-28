const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir frontend estático desde /public
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a MongoDB Atlas con reconexión optimizada para Serverless
let isConnected = false;
const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✅ Conectado a MongoDB Atlas (sgf)');
  } catch (err) {
    console.error('❌ Error de conexión a MongoDB:', err.message);
  }
};
connectDB();

// Middleware para asegurar conexión a BD antes de procesar peticiones
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const movimientoRoutes = require('./routes/movimientoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const grupoRoutes = require('./routes/grupoRoutes');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/movimientos', movimientoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/grupos', grupoRoutes);

// Ruta de prueba de la API
app.get('/api', (req, res) => {
  res.json({ status: 'ok', mensaje: 'API de SGF — funcionando correctamente' });
});

// Arrancar el servidor localmente (en Vercel se exporta la app como función serverless)
const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 SGF ejecutándose en http://localhost:${PORT}`);
  });
}

module.exports = app;
