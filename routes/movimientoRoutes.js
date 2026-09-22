const express = require('express');
const router = express.Router();
const Movimiento = require('../models/Movimiento');
const auth = require('../middleware/auth');

// [GET] /api/movimientos - Obtener todos los movimientos del grupo familiar
router.get('/', auth, async (req, res) => {
  try {
    const movimientos = await Movimiento.find({ grupoId: req.usuario.grupoId })
      .populate('categoriaId', 'nombre tipo')
      .populate('usuarioId', 'nombre email')
      .sort({ fecha: -1 });

    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener movimientos', error: error.message });
  }
});

// [GET] /api/movimientos/resumen - Obtener balance total (Ingresos, Gastos, Saldo)
router.get('/resumen', auth, async (req, res) => {
  try {
    const movimientos = await Movimiento.find({ grupoId: req.usuario.grupoId });

    let totalIngresos = 0;
    let totalGastos = 0;

    movimientos.forEach(m => {
      if (m.tipo === 'Ingreso') {
        totalIngresos += m.monto;
      } else if (m.tipo === 'Gasto') {
        totalGastos += m.monto;
      }
    });

    const saldoTotal = totalIngresos - totalGastos;
    const alertaDeficit = saldoTotal < 0;

    res.json({
      totalIngresos,
      totalGastos,
      saldoTotal,
      alertaDeficit
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el resumen financiero', error: error.message });
  }
});

// [POST] /api/movimientos - Registrar nuevo ingreso o gasto
router.post('/', auth, async (req, res) => {
  try {
    const { tipo, monto, fecha, metodo, concepto, categoriaId } = req.body;

    if (!tipo || !monto || !metodo || !concepto || !categoriaId) {
      return res.status(400).json({ mensaje: 'Todos los campos obligatorios deben estar completos.' });
    }

    const nuevoMovimiento = new Movimiento({
      tipo,
      monto,
      fecha: fecha || Date.now(),
      metodo,
      concepto,
      categoriaId,
      usuarioId: req.usuario.id,
      grupoId: req.usuario.grupoId
    });

    await nuevoMovimiento.save();
    res.status(201).json({ mensaje: 'Movimiento registrado con éxito', movimiento: nuevoMovimiento });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar movimiento', error: error.message });
  }
});

// [PUT] /api/movimientos/:id - Editar movimiento
router.put('/:id', auth, async (req, res) => {
  try {
    const { tipo, monto, fecha, metodo, concepto, categoriaId } = req.body;

    const movimientoActualizado = await Movimiento.findOneAndUpdate(
      { _id: req.params.id, grupoId: req.usuario.grupoId },
      { tipo, monto, fecha, metodo, concepto, categoriaId },
      { new: true }
    );

    if (!movimientoActualizado) {
      return res.status(404).json({ mensaje: 'Movimiento no encontrado o no autorizado.' });
    }

    res.json({ mensaje: 'Movimiento actualizado correctamente', movimiento: movimientoActualizado });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar movimiento', error: error.message });
  }
});

// [DELETE] /api/movimientos/:id - Eliminar movimiento
router.delete('/:id', auth, async (req, res) => {
  try {
    const movimiento = await Movimiento.findOneAndDelete({
      _id: req.params.id,
      grupoId: req.usuario.grupoId
    });

    if (!movimiento) {
      return res.status(404).json({ mensaje: 'Movimiento no encontrado o no autorizado.' });
    }

    res.json({ mensaje: 'Movimiento eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar movimiento', error: error.message });
  }
});

module.exports = router;
