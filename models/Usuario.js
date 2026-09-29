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
  },
  avatar: {
    type: String,
    enum: ['padre', 'madre', 'hijo', 'default'],
    default: 'default'
  },
  intentosFallidos: {
    type: Number,
    default: 0
  },
  bloqueado: {
    type: Boolean,
    default: false
  },
  fechaBloqueo: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
