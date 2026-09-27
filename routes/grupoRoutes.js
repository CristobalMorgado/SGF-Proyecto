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

module.exports = router;
