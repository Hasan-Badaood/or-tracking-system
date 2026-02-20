import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { Patient } from './Patient';
import { Stage } from './Stage';

export class Visit extends Model {
  public id!: number;
  public visit_tracking_id!: string;
  public patient_id!: number;
  public current_stage_id!: number;
  public active!: boolean;
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
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  tableName: 'visits',
  underscored: true
});

Visit.belongsTo(Patient, { foreignKey: 'patient_id' });
Visit.belongsTo(Stage, { foreignKey: 'current_stage_id', as: 'current_stage' });
