const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const auth = require('../middleware/auth');

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
    const { nombre, tipo } = req.body;

    if (!nombre || !tipo) {
      return res.status(400).json({ mensaje: 'Nombre y tipo (Ingreso/Gasto) son obligatorios.' });
    }

    const nuevaCategoria = new Categoria({
      nombre,
      tipo,
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
router.delete('/:id', auth, async (req, res) => {
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
