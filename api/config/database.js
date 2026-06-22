require('dotenv').config(); 
const { Sequelize } = require('sequelize');

const dbName = process.env.DB_NAME || 'siakad_sekolah_orm';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || ''; 
const dbHost = process.env.DB_HOST || 'localhost';

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    dialect: 'mysql',
    logging: false,
    pool: {
        max: 5,         
        min: 0,
        acquire: 30000, 
        idle: 10000
    },
    // 🎯 CONFIG PRODUCTION SAFETY:
    // Otomatis mengaktifkan enkripsi SSL jika aplikasi mendeteksi host selain localhost (Server Cloud).
    // Ini menjaga kuota koneksi Clever Cloud tetap aman dan terenkripsi tanpa merusak jalannya localhost.
    dialectOptions: dbHost !== 'localhost' ? {
        ssl: {
            rejectUnauthorized: false
        }
    } : {}
});

// Penundaan autentikasi 7 detik untuk memastikan server database MySQL Anda sudah siap sepenuhnya sebelum diakses
setTimeout(() => {
    sequelize.authenticate()
        .then(() => console.log(`✅ Koneksi Sequelize ke host ${dbHost} berhasil.`))
        .catch(err => console.error('❌ Tidak dapat terkoneksi ke database:', err));
}, 7000); 

module.exports = sequelize;