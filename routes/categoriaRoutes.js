const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const auth = require('../middleware/auth');

// Middleware para verificar permisos
const isAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'Administrador') {
    return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren permisos de Administrador' });
  }
  next();
};


// [GET] /api/categorias - Obtener categorías del grupo familiar
router.get('/', auth, async (req, res) => {
  try {
    const categorias = await Categoria.find({ grupoId: req.usuario.grupoId });
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener categorías', error: error.message });
  }
});

// [POST] /api/categorias - Crear nueva categoría para el grupo
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, tipo, presupuestoMensual } = req.body;

    const nombreLimpio = nombre ? String(nombre).trim() : '';
    if (!nombreLimpio || nombreLimpio.length < 2) {
      return res.status(400).json({ mensaje: 'El nombre de la categoría no puede estar vacío y debe tener al menos 2 caracteres.' });
    }

    if (!['Ingreso', 'Gasto'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'El tipo debe ser "Ingreso" o "Gasto".' });
    }

    const numPresupuesto = Number(presupuestoMensual || 0);
    if (isNaN(numPresupuesto) || numPresupuesto < 0) {
      return res.status(400).json({ mensaje: 'El presupuesto mensual debe ser un número mayor o igual a 0.' });
    }

    // Verificar que no exista otra categoría con el mismo nombre y tipo en el grupo
    const categoriaExistente = await Categoria.findOne({
      grupoId: req.usuario.grupoId,
      nombre: { $regex: new RegExp(`^${nombreLimpio}$`, 'i') },
      tipo
    });
    if (categoriaExistente) {
      return res.status(400).json({ mensaje: `Ya existe una categoría de ${tipo} llamada "${nombreLimpio}".` });
    }

    const nuevaCategoria = new Categoria({
      nombre: nombreLimpio,
      tipo,
      presupuestoMensual: tipo === 'Gasto' ? numPresupuesto : 0,
      grupoId: req.usuario.grupoId,
      creadoPor: req.usuario.id
    });

    await nuevaCategoria.save();
    res.status(201).json({ mensaje: 'Categoría creada con éxito', categoria: nuevaCategoria });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear la categoría', error: error.message });
  }
});

// [DELETE] /api/categorias/:id - Eliminar categoría
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const categoria = await Categoria.findOneAndDelete({
      _id: req.params.id,
      grupoId: req.usuario.grupoId
    });

    if (!categoria) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada o no autorizada.' });
    }

    res.json({ mensaje: 'Categoría eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar categoría', error: error.message });
  }
});

module.exports = router;
