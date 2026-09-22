const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['Ingreso', 'Gasto'],
    required: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  metodo: {
    type: String,
    enum: ['Efectivo', 'Transferencia'],
    required: true
  },
  concepto: {
    type: String,
    required: true,
    trim: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  categoriaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    required: true
  },
  grupoId: { // Facilita las consultas por grupo familiar
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grupo',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Movimiento', movimientoSchema);
