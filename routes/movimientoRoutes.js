const express = require('express');
const router = express.Router();
const Movimiento = require('../models/Movimiento');
const Categoria = require('../models/Categoria');
const auth = require('../middleware/auth');

// Middleware para verificar permisos
const isAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'Administrador') {
    return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren permisos de Administrador' });
  }
  next();
};


// [GET] /api/movimientos - Obtener todos los movimientos del grupo familiar
router.get('/', auth, async (req, res) => {
  try {
    const movimientos = await Movimiento.find({ grupoId: req.usuario.grupoId })
      .populate('categoriaId', 'nombre tipo')
      .populate('usuarioId', 'nombre email avatar')
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

    // 1. Validar concepto
    const conceptoLimpio = concepto ? String(concepto).trim() : '';
    if (!conceptoLimpio || conceptoLimpio.length < 2) {
      return res.status(400).json({ mensaje: 'El concepto no puede estar vacío y debe tener al menos 2 caracteres.' });
    }

    // 2. Validar monto
    const numMonto = Number(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      return res.status(400).json({ mensaje: 'El monto debe ser un número válido mayor a 0.' });
    }

    // 3. Validar tipo
    if (!['Ingreso', 'Gasto'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'El tipo debe ser estrictamente "Ingreso" o "Gasto".' });
    }

    // 4. Validar método
    if (!['Efectivo', 'Transferencia', 'Tarjeta'].includes(metodo)) {
      return res.status(400).json({ mensaje: 'El método debe ser "Efectivo", "Transferencia" o "Tarjeta".' });
    }

    // 5. Validar categoría
    if (!categoriaId) {
      return res.status(400).json({ mensaje: 'Debes seleccionar una categoría.' });
    }
    const categoriaExiste = await Categoria.findOne({ _id: categoriaId, grupoId: req.usuario.grupoId });
    if (!categoriaExiste) {
      return res.status(400).json({ mensaje: 'La categoría seleccionada no existe o no pertenece a tu grupo familiar.' });
    }

    // 6. Validar fecha
    const fechaObj = fecha ? new Date(fecha) : new Date();
    if (isNaN(fechaObj.getTime())) {
      return res.status(400).json({ mensaje: 'La fecha ingresada no es válida.' });
    }

    const nuevoMovimiento = new Movimiento({
      tipo,
      monto: numMonto,
      fecha: fechaObj,
      metodo,
      concepto: conceptoLimpio,
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
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { tipo, monto, fecha, metodo, concepto, categoriaId } = req.body;

    // 1. Validar concepto
    const conceptoLimpio = concepto ? String(concepto).trim() : '';
    if (!conceptoLimpio || conceptoLimpio.length < 2) {
      return res.status(400).json({ mensaje: 'El concepto no puede estar vacío y debe tener al menos 2 caracteres.' });
    }

    // 2. Validar monto
    const numMonto = Number(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      return res.status(400).json({ mensaje: 'El monto debe ser un número válido mayor a 0.' });
    }

    // 3. Validar tipo
    if (!['Ingreso', 'Gasto'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'El tipo debe ser estrictamente "Ingreso" o "Gasto".' });
    }

    // 4. Validar método
    if (!['Efectivo', 'Transferencia', 'Tarjeta'].includes(metodo)) {
      return res.status(400).json({ mensaje: 'El método debe ser "Efectivo", "Transferencia" o "Tarjeta".' });
    }

    // 5. Validar categoría
    if (!categoriaId) {
      return res.status(400).json({ mensaje: 'Debes seleccionar una categoría.' });
    }
    const categoriaExiste = await Categoria.findOne({ _id: categoriaId, grupoId: req.usuario.grupoId });
    if (!categoriaExiste) {
      return res.status(400).json({ mensaje: 'La categoría seleccionada no existe o no pertenece a tu grupo familiar.' });
    }

    // 6. Validar fecha
    const fechaObj = fecha ? new Date(fecha) : new Date();
    if (isNaN(fechaObj.getTime())) {
      return res.status(400).json({ mensaje: 'La fecha ingresada no es válida.' });
    }

    const movimientoActualizado = await Movimiento.findOneAndUpdate(
      { _id: req.params.id, grupoId: req.usuario.grupoId },
      { tipo, monto: numMonto, fecha: fechaObj, metodo, concepto: conceptoLimpio, categoriaId },
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
router.delete('/:id', auth, isAdmin, async (req, res) => {
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
