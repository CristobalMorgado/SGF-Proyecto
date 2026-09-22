const mongoose = require('mongoose');

const grupoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    default: 'Familia'
  },
  estadoMembresia: {
    type: String,
    enum: ['Activa', 'Vencida'],
    default: 'Activa'
  },
  fechaVencimiento: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 días por defecto
  }
}, { timestamps: true });

module.exports = mongoose.model('Grupo', grupoSchema);
