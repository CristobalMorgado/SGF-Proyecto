# 💰 SGF — Sistema de Gestión Financiera Familiar

> **Proyecto MVP — Ingeniería de Software INACAP 2026**

[![Deploy with Vercel](https://vercel.com/button)](https://sgf-proyecto.vercel.app/)
[![Vercel Status](https://img.shields.io/badge/Vercel-Deploy%20Live-brightgreen?logo=vercel)](https://sgf-proyecto.vercel.app/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey?logo=express)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/cloud/atlas)

Plataforma web para la administración y control financiero del hogar. Permite registrar y categorizar ingresos y gastos, visualizar balances y presupuestos en tiempo real, analizar gráficos interactivos, recibir alertas de exceso de gastos y exportar reportes ejecutivos.

---

## 🌐 Demo en Vivo
Puedes acceder a la versión desplegada en producción directamente desde:
👉 **[https://sgf-proyecto.vercel.app/](https://sgf-proyecto.vercel.app/)**

---

## ✨ Características Principales

- 🔐 **Autenticación Segura:** Registro e inicio de sesión con JWT (JSON Web Tokens) y contraseñas cifradas con `bcryptjs`.
- 📊 **Panel Financiero (Dashboard):** Visualización en tiempo real de ingresos totales, gastos totales, balance neto y barra de cumplimiento de presupuesto mensual.
- 💳 **Gestión de Transacciones:** Registro dinámico de ingresos y gastos con selección de categorías, montos y fechas automáticas ajustadas a la zona horaria local.
- 📈 **Gráficos Interactivos (Chart.js):** 
  - Gráfico de dona con la distribución porcentual de gastos por categoría.
  - Gráfico de barras con la comparativa mensual de ingresos vs. gastos.
- ⚠️ **Alertas Inteligentes:** Notificaciones automáticas cuando los gastos superan el límite de presupuesto establecido.
- 📑 **Exportación de Reportes:** Generación inmediata de reportes en formatos **PDF** y **Excel (XLSX)**.
- 👤 **Gestión de Perfil:** Personalización de datos de usuario, asignación de rol familiar y selección de avatar interactivo (Padre, Madre, Hijo).

---

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3, Tailwind CSS, FontAwesome, Chart.js, jsPDF, SheetJS (XLSX).
- **Backend:** Node.js, Express.js.
- **Base de Datos:** MongoDB Atlas (Cloud NoSQL DB) gestionada con Mongoose ODM.
- **Despliegue:** Vercel (Serverless Functions) con integración continua desde GitHub.

---

## 🚀 Ejecución en Entorno Local

Si deseas ejecutar el proyecto localmente en tu equipo:

### 1. Clonar el repositorio
```bash
git clone https://github.com/CristobalMorgado/SGF-Proyecto.git
cd SGF-Proyecto
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:
```env
PORT=3000
MONGO_URI=tu_cadena_de_conexion_a_mongodb_atlas
JWT_SECRET=tu_clave_secreta_jwt
```

### 4. Iniciar el servidor
```bash
npm start
```
Abre tu navegador en `http://localhost:3000`.

---

## 📂 Estructura del Proyecto

```text
SGF-Proyecto/
├── index.js              # Servidor Express principal y conexión a MongoDB
├── vercel.json           # Configuración de despliegue serverless en Vercel
├── package.json          # Metadatos del proyecto y dependencias
├── models/               # Modelos Mongoose (User, Transaction, etc.)
├── routes/               # Endpoints de la API REST (auth, transactions, reports)
├── middleware/           # Middlewares de seguridad y validación JWT
└── public/               # Frontend estático (HTML, CSS, JS, imágenes y avatares)
```

---

## 👥 Equipo de Desarrollo
Proyecto desarrollado para la asignatura de **Ingeniería de Software** — **INACAP 2026**.
