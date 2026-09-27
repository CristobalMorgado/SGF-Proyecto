const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const auth = require('../middleware/auth');

// Middleware para verificar si el usuario es Administrador
const isAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'Administrador') {
    return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren permisos de Administrador' });
  }
  next();
};

// [GET] /api/usuarios - Obtener todos los miembros del grupo
router.get('/', auth, async (req, res) => {
  try {
    const usuarios = await Usuario.find({ grupoId: req.usuario.grupoId }).select('-password');
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener miembros de la familia', error: error.message });
  }
});

// [POST] /api/usuarios - Crear un nuevo miembro (Solo Admin)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // Verificar si el correo ya existe
    let usuarioExiste = await Usuario.findOne({ email });
    if (usuarioExiste) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
    }

    // Encriptar la contraseña provisional
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear al miembro
    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password: passwordHash,
      rol: 'Miembro',
      grupoId: req.usuario.grupoId
    });

    await nuevoUsuario.save();
    
    // No devolver la contraseña
    nuevoUsuario.password = undefined;
    
    res.status(201).json({ mensaje: 'Miembro agregado exitosamente', usuario: nuevoUsuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear miembro', error: error.message });
  }
});

// [DELETE] /api/usuarios/:id - Eliminar un miembro (Solo Admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    // Evitar que el administrador se elimine a sí mismo accidentalmente
    if (req.params.id === req.usuario.id) {
      return res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta de Administrador desde aquí.' });
    }

    const usuario = await Usuario.findOneAndDelete({ _id: req.params.id, grupoId: req.usuario.grupoId });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado o no pertenece a tu grupo familiar.' });
    }

    res.json({ mensaje: 'Miembro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar miembro', error: error.message });
  }
});

module.exports = router;
