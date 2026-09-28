const express = require('express');
const router = express.Router();
const Grupo = require('../models/Grupo');
const auth = require('../middleware/auth');

// [GET] /api/grupos/me - Obtener detalles del grupo familiar (Membresía)
router.get('/me', auth, async (req, res) => {
  try {
    const grupo = await Grupo.findById(req.usuario.grupoId);
    if (!grupo) {
      return res.status(404).json({ mensaje: 'Grupo no encontrado' });
    }

    const now = new Date();
    const vencimiento = new Date(grupo.fechaVencimiento);
    
    // Si la fecha ya pasó, forzamos el estado a Vencida
    if (now > vencimiento && grupo.estadoMembresia === 'Activa') {
      grupo.estadoMembresia = 'Vencida';
      await grupo.save();
    } 
    // Corrección para pruebas: Si el usuario adelanta la fecha manualmente, la volvemos a poner Activa
    else if (now <= vencimiento && grupo.estadoMembresia === 'Vencida') {
      grupo.estadoMembresia = 'Activa';
      await grupo.save();
    }

    res.json({
      id: grupo._id,
      nombre: grupo.nombre,
      estadoMembresia: grupo.estadoMembresia,
      fechaVencimiento: grupo.fechaVencimiento
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener datos del grupo', error: error.message });
  }
});


// [POST] /api/grupos/simular-pago - Simular la renovación de la membresía
router.post('/simular-pago', auth, async (req, res) => {
  try {
    const grupo = await Grupo.findById(req.usuario.grupoId);
    if (!grupo) {
      return res.status(404).json({ mensaje: 'Grupo no encontrado' });
    }

    // Agregar 30 días a la fecha actual
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + 30);

    grupo.fechaVencimiento = nuevaFecha;
    grupo.estadoMembresia = 'Activa';
    await grupo.save();

    res.json({ mensaje: 'Pago simulado con éxito', fechaVencimiento: nuevaFecha });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al simular el pago', error: error.message });
  }
});

module.exports = router;
