const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Grupo = require('../models/Grupo');

// [POST] /api/auth/registro - Registro de Usuario y creación de Grupo
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, nombreGrupo } = req.body;

    const nombreLimpio = nombre ? String(nombre).trim() : '';
    if (!nombreLimpio || nombreLimpio.length < 2) {
      return res.status(400).json({ mensaje: 'El nombre debe tener al menos 2 caracteres.' });
    }

    const emailLimpio = email ? String(email).trim().toLowerCase() : '';
    if (!emailLimpio || !emailLimpio.includes('@')) {
      return res.status(400).json({ mensaje: 'Ingresa un correo electrónico válido.' });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // 1. Verificar si el email ya está en uso
    let usuarioExiste = await Usuario.findOne({ email: emailLimpio });
    if (usuarioExiste) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
    }

    // 2. Crear el Grupo Familiar para el usuario
    const nuevoGrupo = new Grupo({
      nombre: (nombreGrupo && String(nombreGrupo).trim()) || `Familia de ${nombreLimpio}`
    });
    const grupoGuardado = await nuevoGrupo.save();

    // 3. Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Crear el Usuario como Administrador de este nuevo grupo
    const nuevoUsuario = new Usuario({
      nombre: nombreLimpio,
      email: emailLimpio,
      password: passwordHash,
      rol: 'Administrador',
      grupoId: grupoGuardado._id
    });
    await nuevoUsuario.save();

    res.status(201).json({ mensaje: 'Usuario y Grupo registrados exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error interno en el servidor', error: error.message });
  }
});

// [POST] /api/auth/login - Inicio de Sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Buscar al usuario
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    // 2. Comparar la contraseña proporcionada con el hash de la BD
    const esPasswordValida = await bcrypt.compare(password, usuario.password);
    if (!esPasswordValida) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    // 3. Crear el Token JWT con los datos relevantes (ID, Grupo y Rol)
    const payload = {
      id: usuario._id,
      nombre: usuario.nombre,
      grupoId: usuario.grupoId,
      rol: usuario.rol,
      avatar: usuario.avatar || 'default'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, mensaje: 'Inicio de sesión exitoso' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error interno en el servidor', error: error.message });
  }
});

module.exports = router;
