import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class StageEvent extends Model {
  public id!: number;
  public visit_id!: number;
  public from_stage_id!: number | null;
  public to_stage_id!: number;
  public updated_by!: number;
  public notes!: string | null;
  public readonly created_at!: Date;
}

StageEvent.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  visit_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  from_stage_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  to_stage_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'stage_events',
  underscored: true,
  updatedAt: false
});
