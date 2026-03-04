import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from './config/database';
import { User, Stage, ORRoom } from './models';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    await sequelize.sync({ force: false });
    console.log('Tables synced.');

    // Stages
    const stageCount = await Stage.count();
    if (stageCount === 0) {
      await Stage.bulkCreate([
        { name: 'Arrived',     description: 'Patient has arrived and checked in',        color: '#3498db', display_order: 1 },
        { name: 'Pre-Op',      description: 'Patient in pre-operative assessment',        color: '#f39c12', display_order: 2 },
        { name: 'Ready',       description: 'Patient ready for theatre',                  color: '#27ae60', display_order: 3 },
        { name: 'In Theatre',  description: 'Patient currently in operating theatre',     color: '#e74c3c', display_order: 4 },
        { name: 'Recovery',    description: 'Patient in post-operative recovery',         color: '#9b59b6', display_order: 5 },
        { name: 'Discharged',  description: 'Patient has been discharged',                color: '#95a5a6', display_order: 6 },
      ]);
      console.log('Stages seeded.');
    } else {
      console.log('Stages already exist, skipping.');
    }

    // OR Rooms
    const roomCount = await ORRoom.count();
    if (roomCount === 0) {
      await ORRoom.bulkCreate([
        { room_number: 'OR-1', name: 'OR 1', status: 'Available' },
        { room_number: 'OR-2', name: 'OR 2', status: 'Available' },
        { room_number: 'OR-3', name: 'OR 3', status: 'Available' },
        { room_number: 'OR-4', name: 'OR 4', status: 'Available' },
        { room_number: 'OR-5', name: 'OR 5', status: 'Maintenance' },
      ]);
      console.log('OR rooms seeded.');
    } else {
      console.log('Rooms already exist, skipping.');
    }

    // Users
    const userCount = await User.count();
    if (userCount === 0) {
      const adminHash     = await bcrypt.hash('admin123', 10);
      const nurseHash     = await bcrypt.hash('nurse123', 10);
      const receptionHash = await bcrypt.hash('reception123', 10);

      await User.bulkCreate([
        {
          username: 'admin',
          password_hash: adminHash,
          name: 'Admin User',
          role: 'admin',
          email: 'admin@hospital.nhs.uk',
          active: true,
        },
        {
          username: 'nurse1',
          password_hash: nurseHash,
          name: 'Nurse Johnson',
          role: 'nurse',
          email: 'nurse.johnson@hospital.nhs.uk',
          active: true,
        },
        {
          username: 'reception',
          password_hash: receptionHash,
          name: 'Reception Desk',
          role: 'reception',
          email: 'reception@hospital.nhs.uk',
          active: true,
        },
      ]);
      console.log('Users seeded.');
      console.log('');
      console.log('Login credentials:');
      console.log('  admin      / admin123');
      console.log('  nurse1     / nurse123');
      console.log('  reception  / reception123');
    } else {
      console.log('Users already exist, skipping.');
    }

    console.log('');
    console.log('Seed complete.');
    await sequelize.close();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
