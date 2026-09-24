const express = require('express');
const cors = require('cors');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Base de Datos PostgreSQL con Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ecolux_db', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DATABASE_URL ? { require: true, rejectUnauthorized: false } : false
  },
  logging: false
});

// Definición de Modelos Centralizados en la Nube
const Operario = sequelize.define('Operario', {
  leg: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING, allowNull: false },
  cuil: { type: DataTypes.STRING },
  categoria: { type: DataTypes.STRING },
  ingreso: { type: DataTypes.STRING },
  egreso: { type: DataTypes.STRING },
  domicilio: { type: DataTypes.STRING }
});

const Cliente = sequelize.define('Cliente', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  direccion: { type: DataTypes.STRING },
  mail: { type: DataTypes.STRING },
  facturacion: { type: DataTypes.STRING },
  estado: { type: DataTypes.STRING, defaultValue: 'Activo' }
});

const Personal = sequelize.define('Personal', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  celular: { type: DataTypes.STRING },
  modelo: { type: DataTypes.STRING },
  cuil: { type: DataTypes.STRING }
});

const Proveedor = sequelize.define('Proveedor', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  detalle: { type: DataTypes.STRING }
});

const Numero = sequelize.define('Numero', {
  concepto: { type: DataTypes.STRING, allowNull: false },
  numero: { type: DataTypes.STRING }
});

const Vehiculo = sequelize.define('Vehiculo', {
  vehiculo: { type: DataTypes.STRING, allowNull: false },
  patente: { type: DataTypes.STRING, allowNull: false },
  dueno: { type: DataTypes.STRING },
  chasis: { type: DataTypes.STRING },
  motor: { type: DataTypes.STRING },
  seguro: { type: DataTypes.STRING },
  vtoVtv: { type: DataTypes.STRING }
});

const Tarea = sequelize.define('Tarea', {
  fecha: { type: DataTypes.STRING, allowNull: false },
  detalle: { type: DataTypes.STRING, allowNull: false },
  estado: { type: DataTypes.STRING, defaultValue: 'Pendiente' }
});

const Factura = sequelize.define('Factura', {
  numero: { type: DataTypes.STRING, allowNull: false },
  vencimiento: { type: DataTypes.STRING },
  razon: { type: DataTypes.STRING, allowNull: false },
  monto: { type: DataTypes.FLOAT, allowNull: false },
  estado: { type: DataTypes.STRING, defaultValue: 'Pendiente' }
});

const Retencion = sequelize.define('Retencion', {
  facturaId: { type: DataTypes.INTEGER },
  numero: { type: DataTypes.STRING },
  razon: { type: DataTypes.STRING },
  montoTotal: { type: DataTypes.FLOAT },
  abonado: { type: DataTypes.FLOAT },
  estado: { type: DataTypes.STRING, defaultValue: 'Pendiente' }
});

// --- RUTAS API REST ---
['operarios', 'clientes', 'personal', 'proveedores', 'numeros', 'vehiculos', 'tareas', 'facturas', 'retenciones'].forEach(recurso => {
  const Model = { operarios: Operario, clientes: Cliente, personal: Personal, proveedores: Proveedor, numeros: Numero, vehiculos: Vehiculo, tareas: Tarea, facturas: Factura, retenciones: Retencion }[recurso];

  app.get(`/api/${recurso}`, async (req, res) => {
    try { const data = await Model.findAll(); res.json(data); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post(`/api/${recurso}`, async (req, res) => {
    try { const item = await Model.create(req.body); res.json(item); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.put(`/api/${recurso}/:id`, async (req, res) => {
    try { await Model.update(req.body, { where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete(`/api/${recurso}/:id`, async (req, res) => {
    try { await Model.destroy({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

// Inicialización de Base de Datos y Servidor
const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
  console.log('Base de datos conectada y sincronizada correctamente.');
  app.listen(PORT, () => console.log(`Servidor Ecolux corriendo en puerto ${PORT}`));
});