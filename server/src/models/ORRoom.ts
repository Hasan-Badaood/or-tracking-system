import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class ORRoom extends Model {
  public id!: number;
  public room_number!: string;
  public name!: string;
  public room_type!: string;
  public capacity!: string;
  public status!: string;
  public current_visit_id!: number | null;
  public last_status_change!: Date;
  public active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ORRoom.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  room_number: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  room_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'General'
  },
  capacity: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Standard'
  },
  status: {
    type: DataTypes.ENUM('Available', 'Occupied', 'Cleaning', 'Maintenance'),
    allowNull: false,
    defaultValue: 'Available'
  },
  current_visit_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  last_status_change: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  tableName: 'or_rooms',
  underscored: true
});
