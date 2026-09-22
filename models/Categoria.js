const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['Ingreso', 'Gasto'],
    required: true
  },
  grupoId: { // Usamos grupoId para que las categorías sean compartidas por la familia
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grupo',
    required: true
  },
  creadoPor: { // Para saber qué usuario la creó, según el documento
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }
}, { timestamps: true });

module.exports = mongoose.model('Categoria', categoriaSchema);
