import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class CleaningTimer extends Model {
  public id!: number;
  public room_id!: number;
  public visit_id!: number | null;
  public started_at!: Date;
  public scheduled_end_at!: Date;
  public actual_end_at!: Date | null;
  public duration_minutes!: number;
  public completed!: boolean;
  public manually_overridden!: boolean;
  public override_reason!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CleaningTimer.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  visit_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  scheduled_end_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  actual_end_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  manually_overridden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  override_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'cleaning_timers',
  underscored: true
});
