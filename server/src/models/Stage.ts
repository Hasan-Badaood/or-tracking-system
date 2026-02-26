import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Stage extends Model {
  public id!: number;
  public name!: string;
  public color!: string;
  public display_order!: number;
  public description!: string;
  public active!: boolean;
}

Stage.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false
  },
  display_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  tableName: 'stages',
  underscored: true,
  timestamps: false
});
