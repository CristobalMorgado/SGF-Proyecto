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

    const nombreLimpio = nombre ? String(nombre).trim() : '';
    if (!nombreLimpio || nombreLimpio.length < 2) {
      return res.status(400).json({ mensaje: 'El nombre del miembro debe tener al menos 2 caracteres.' });
    }

    const emailLimpio = email ? String(email).trim().toLowerCase() : '';
    if (!emailLimpio || !emailLimpio.includes('@')) {
      return res.status(400).json({ mensaje: 'Debes proporcionar un correo electrónico válido.' });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña provisional debe tener al menos 8 caracteres.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ mensaje: 'La contraseña provisional debe incluir al menos una letra mayúscula.' });
    }
    if (!/\d/.test(password)) {
      return res.status(400).json({ mensaje: 'La contraseña provisional debe incluir al menos un número.' });
    }

    // Verificar si el correo ya existe
    let usuarioExiste = await Usuario.findOne({ email: emailLimpio });
    if (usuarioExiste) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
    }

    // Encriptar la contraseña provisional
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear al miembro
    const nuevoUsuario = new Usuario({
      nombre: nombreLimpio,
      email: emailLimpio,
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


// [PUT] /api/usuarios/me - Actualizar perfil propio
router.put('/me', auth, async (req, res) => {
  try {
    const { nombre, password, currentPassword, avatar } = req.body;
    const usuario = await Usuario.findById(req.usuario.id);

    if (nombre) {
      const nombreLimpio = String(nombre).trim();
      if (nombreLimpio.length >= 2) usuario.nombre = nombreLimpio;
    }

    if (avatar && ['padre', 'madre', 'hijo', 'default'].includes(avatar)) {
      usuario.avatar = avatar;
    }

    if (password) {
      const bcrypt = require('bcryptjs');
      if (!currentPassword) {
         return res.status(400).json({ mensaje: 'Debes ingresar tu contraseña actual para poder cambiarla.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, usuario.password);
      if (!isMatch) {
         return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ mensaje: 'La nueva contraseña debe incluir al menos una letra mayúscula.' });
      }
      if (!/\d/.test(password)) {
        return res.status(400).json({ mensaje: 'La nueva contraseña debe incluir al menos un número.' });
      }
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(password, salt);
    }

    await usuario.save();
    res.json({ mensaje: 'Perfil actualizado con éxito', nombre: usuario.nombre, avatar: usuario.avatar });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar perfil', error: error.message });
  }
});


// [GET] /api/usuarios/me - Obtener mis datos
router.get('/me', auth, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password');
    res.json({ usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener datos', error: error.message });
  }
});


// [PUT] /api/usuarios/:id/reset-password - Restablecer contraseña (Solo Admin / SysAdmin)
router.put('/:id/reset-password', auth, isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe incluir al menos una letra mayúscula.' });
    }
    if (!/\d/.test(newPassword)) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe incluir al menos un número.' });
    }

    const usuario = await Usuario.findOne({ _id: req.params.id, grupoId: req.usuario.grupoId });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado en tu grupo.' });
    }

    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(newPassword, salt);
    usuario.bloqueado = false;
    usuario.intentosFallidos = 0;
    usuario.fechaBloqueo = null;
    await usuario.save();

    res.json({ mensaje: `Contraseña de ${usuario.nombre} restablecida y cuenta desbloqueada con éxito.` });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al restablecer contraseña', error: error.message });
  }
});

// [PUT] /api/usuarios/:id/desbloquear - Desbloquear cuenta de un miembro (Solo Admin)
router.put('/:id/desbloquear', auth, isAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ _id: req.params.id, grupoId: req.usuario.grupoId });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado en tu grupo.' });
    }

    usuario.bloqueado = false;
    usuario.intentosFallidos = 0;
    usuario.fechaBloqueo = null;
    await usuario.save();

    res.json({ mensaje: `Cuenta de ${usuario.nombre} desbloqueada exitosamente.` });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al desbloquear usuario', error: error.message });
  }
});

module.exports = router;
