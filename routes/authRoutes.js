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

    if (!password || String(password).length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ mensaje: 'La contraseña debe incluir al menos una letra mayúscula.' });
    }
    if (!/\d/.test(password)) {
      return res.status(400).json({ mensaje: 'La contraseña debe incluir al menos un número.' });
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

    const emailLimpio = email ? String(email).trim().toLowerCase() : '';

    // 1. Buscar al usuario
    const usuario = await Usuario.findOne({ email: emailLimpio });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    // 2. Verificar si la cuenta se encuentra bloqueada
    if (usuario.bloqueado) {
      return res.status(403).json({
        mensaje: 'Cuenta bloqueada por contraseña incorrecta, favor comunicarse al +569 1234 5678.',
        bloqueado: true
      });
    }

    // 3. Comparar la contraseña proporcionada con el hash de la BD
    const esPasswordValida = await bcrypt.compare(password, usuario.password);
    if (!esPasswordValida) {
      usuario.intentosFallidos = (usuario.intentosFallidos || 0) + 1;

      if (usuario.intentosFallidos >= 3) {
        usuario.bloqueado = true;
        usuario.fechaBloqueo = new Date();
        await usuario.save();
        return res.status(403).json({
          mensaje: 'Cuenta bloqueada por contraseña incorrecta, favor comunicarse al +569 1234 5678.',
          bloqueado: true
        });
      }

      await usuario.save();
      const restantes = 3 - usuario.intentosFallidos;
      return res.status(400).json({
        mensaje: `Contraseña incorrecta. Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'} antes de que tu cuenta sea bloqueada.`,
        intentosRestantes: restantes,
        intentosFallidos: usuario.intentosFallidos
      });
    }

    // 4. Si la contraseña es correcta, reiniciar contador de intentos fallidos si tenía
    if (usuario.intentosFallidos > 0) {
      usuario.intentosFallidos = 0;
      await usuario.save();
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
