const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware - Límite aumentado para sincronización inicial
app.use(express.json({ limit: '50mb' })); 
app.use(cors());

// --- Database Connection (MySQL 8.4) ---
const isProduction = !!process.env.DATABASE_URL;

const sequelize = isProduction
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        logging: false,
        dialectOptions: { ssl: { rejectUnauthorized: false } }
      })
    : new Sequelize(
        process.env.DB_NAME || 'medicall_db',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || 'password',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'mysql',
            logging: false,
            port: process.env.DB_PORT || 3306
        }
      );

// --- Models Definition ---

const Doctor = sequelize.define('Doctor', {
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    category: { type: DataTypes.STRING, defaultValue: 'MEDICO' },
    executive: DataTypes.STRING,
    name: DataTypes.STRING,
    specialty: DataTypes.STRING,
    subSpecialty: DataTypes.STRING,
    address: DataTypes.TEXT,
    hospital: DataTypes.STRING,
    area: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    floor: DataTypes.STRING,
    officeNumber: DataTypes.STRING,
    birthDate: DataTypes.STRING,
    cedula: DataTypes.STRING,
    profile: DataTypes.TEXT,
    classification: DataTypes.STRING,
    socialStyle: DataTypes.STRING,
    attitudinalSegment: DataTypes.STRING,
    importantNotes: DataTypes.TEXT,
    isInsuranceDoctor: { type: DataTypes.BOOLEAN, defaultValue: false },
    visits: { type: DataTypes.JSON, defaultValue: [] },
    schedule: { type: DataTypes.JSON, defaultValue: [] }
});

const Procedure = sequelize.define('Procedure', {
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    date: DataTypes.STRING,
    time: DataTypes.STRING,
    hospital: DataTypes.STRING,
    doctorId: DataTypes.STRING,
    doctorName: DataTypes.STRING,
    procedureType: DataTypes.STRING,
    paymentType: DataTypes.STRING,
    cost: DataTypes.FLOAT,
    commission: DataTypes.FLOAT,
    technician: DataTypes.STRING,
    notes: DataTypes.TEXT,
    status: DataTypes.STRING
});

// Sincronizar base de datos
sequelize.sync({ alter: true })
    .then(() => console.log("✅ MySQL 8.4 CRM MediCall Activo"))
    .catch(err => {
        console.error("❌ Error MySQL:", err);
        process.exit(1);
    });

// --- API Routes ---

app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.findAll();
        res.json(doctors);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/doctors', async (req, res) => {
    try {
        await Doctor.upsert(req.body);
        const result = await Doctor.findByPk(req.body.id);
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/doctors/bulk', async (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: "Data must be an array" });
    try {
        await sequelize.transaction(async (t) => {
            await Doctor.bulkCreate(data, {
                updateOnDuplicate: [
                    'category', 'executive', 'name', 'specialty', 'subSpecialty', 
                    'address', 'hospital', 'area', 'phone', 'email', 'floor', 
                    'officeNumber', 'importantNotes', 'visits', 'schedule', 'updatedAt'
                ],
                transaction: t
            });
        });
        res.json({ success: true, count: data.length });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/doctors/:id', async (req, res) => {
    try {
        await Doctor.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/doctors/:doctorId/visits/:visitId', async (req, res) => {
    const { doctorId, visitId } = req.params;
    try {
        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor) return res.status(404).send();
        doctor.visits = (doctor.visits || []).filter(v => v.id !== visitId);
        doctor.changed('visits', true); 
        await doctor.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/procedures', async (req, res) => {
    try {
        const procedures = await Procedure.findAll();
        res.json(procedures);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/procedures', async (req, res) => {
    try {
        await Procedure.upsert(req.body);
        const result = await Procedure.findByPk(req.body.id);
        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/procedures/:id', async (req, res) => {
    try {
        await Procedure.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Static Files
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'dist', 'index.html')); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Servidor en puerto ${PORT}`); });
