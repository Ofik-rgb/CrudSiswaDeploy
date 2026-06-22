// models/Admin.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  userId: { 
    type: DataTypes.INTEGER, 
    unique: 'idx_admin_userid' // 🎯 KUNCI: Mencegah duplikasi indeks sampah pada relasi user admin
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  no_wa: { 
    type: DataTypes.STRING 
  },
  foto: { 
    type: DataTypes.TEXT('long') 
  }
}, { 
  tableName: 'admins', 
  timestamps: false 
});

module.exports = Admin;