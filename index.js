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

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas (sgf)'))
  .catch((err) => console.error('❌ Error de conexión a MongoDB:', err.message));

// Importar rutas
const authRoutes = require('./routes/authRoutes');

// Usar rutas
app.use('/api/auth', authRoutes);

// Ruta de prueba de la API
app.get('/api', (req, res) => {
  res.json({ status: 'ok', mensaje: 'API de SGF — funcionando correctamente' });
});

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SGF ejecutándose en http://localhost:${PORT}`);
});
