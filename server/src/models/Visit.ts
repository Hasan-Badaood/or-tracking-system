import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Visit extends Model {
  public id!: number;
  public visit_tracking_id!: string;
  public patient_id!: number;
  public current_stage_id!: number;
  public or_room_id!: number | null;
  public created_by!: number;
  public notes!: string | null;
  public scheduled_time!: Date | null;
  public barcode_data!: string;
  public active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Visit.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  visit_tracking_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  patient_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  current_stage_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  or_room_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  barcode_data: {
    type: DataTypes.STRING,
    allowNull: false
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  tableName: 'visits',
  underscored: true
});
