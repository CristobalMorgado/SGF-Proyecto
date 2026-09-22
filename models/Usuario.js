const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { // En el modelo lógico se llamó passwordHash
    type: String,
    required: true
  },
  rol: {
    type: String,
    enum: ['Administrador', 'Miembro'],
    default: 'Miembro'
  },
  grupoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grupo',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
