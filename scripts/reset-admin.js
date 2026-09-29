// Script de emergencia para restablecer la contraseña y desbloquear una cuenta de Administrador o Miembro
// Uso: node scripts/reset-admin.js <email> <nueva_clave>
// Ejemplo: node scripts/reset-admin.js tu@correo.com ClaveSegura2026

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

const args = process.argv.slice(2);
const email = args[0] ? args[0].trim().toLowerCase() : null;
const newPassword = args[1];

if (!email || !newPassword) {
  console.log('❌ Error: Parámetros incompletos.');
  console.log('📌 Uso: node scripts/reset-admin.js <correo> <nueva_contraseña>');
  console.log('👉 Ejemplo: node scripts/reset-admin.js admin@correo.com ClaveSegura2026');
  process.exit(1);
}

if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
  console.log('❌ Error: La contraseña debe tener al menos 8 caracteres, incluir números y al menos 1 letra mayúscula.');
  process.exit(1);
}

async function ejecutar() {
  try {
    if (!process.env.MONGO_URI) {
      console.log('❌ Error: MONGO_URI no está definido en el archivo .env');
      process.exit(1);
    }

    console.log('⏳ Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a la base de datos.');

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      console.log(`❌ No se encontró ningún usuario con el correo: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(newPassword, salt);
    usuario.bloqueado = false;
    usuario.intentosFallidos = 0;
    usuario.fechaBloqueo = null;

    await usuario.save();

    console.log(`🎉 ¡ÉXITO! La contraseña para [${usuario.nombre} (${usuario.email}) - Rol: ${usuario.rol}] ha sido actualizada.`);
    console.log('🔓 La cuenta ha sido desbloqueada y el contador de intentos fallidos se reinició a 0.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando el script:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

ejecutar();
