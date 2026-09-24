const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Multer para recibir archivos en memoria
const upload = multer({ storage: multer.memoryStorage() });

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Base de Datos PostgreSQL con Sequelize
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR CRÍTICO: La variable DATABASE_URL no está definida en Render.");
  process.exit(1);
}

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

// Definición de Modelos
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
  chasis: { type: DataTypes.STRING, allowNull: false },
  motor: { type: DataTypes.STRING, allowNull: false },
  seguro: { type: DataTypes.STRING, allowNull: false },
  vtoVtv: { type: DataTypes.STRING, allowNull: false }
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

// --- RUTA PARA PROCESAR Y GUARDAR ARCHIVOS EXCEL / WORD PERMANENTEMENTE ---
app.post('/api/upload-file', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      
      // Procesar solapa Operarios / Empleados
      if (workbook.Sheets['Empleados'] || workbook.Sheets[' Empleados']) {
        const sheet = workbook.Sheets['Empleados'] || workbook.Sheets[' Empleados'];
        const rows = XLSX.utils.sheet_to_json(sheet);
        for (let r of rows) {
          if (r['Leg.'] && r['Apellido y Nombre']) {
            await Operario.create({
              leg: Number(r['Leg.']),
              nombre: r['Apellido y Nombre'],
              cuil: String(r['CUIL'] || ''),
              domicilio: r['Teléfono y dirección'] || '',
              categoria: r['Categoría'] || 'General'
            });
          }
        }
      }

      // Procesar solapa Clientes
      if (workbook.Sheets['Clientes']) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Clientes']);
        for (let r of rows) {
          if (r['Clientes']) {
            await Cliente.create({
              nombre: r['Clientes'],
              direccion: r['Direccion '] || '',
              mail: r['Mail'] || '',
              facturacion: r['Datos facturacion'] || '',
              estado: 'Activo'
            });
          }
        }
      }
    } else if (ext === '.docx') {
      // Procesar archivo Word y guardar como Proveedor o Tarea genérica
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      const texto = result.value;
      await Proveedor.create({
        nombre: `Archivo: ${req.file.originalname}`,
        detalle: texto.substring(0, 500) // Guarda un resumen del texto del Word
      });
    }

    res.json({ success: true, message: '¡Archivo procesado y guardado permanentemente en la base de datos!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- RUTAS API REST ESTÁNDAR ---
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

const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
  console.log('Base de datos conectada y sincronizada correctamente.');
  app.listen(PORT, () => console.log(`Servidor Ecolux corriendo en puerto ${PORT}`));
});
