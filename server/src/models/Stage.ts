import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Stage extends Model {
  public id!: number;
  public name!: string;
  public color!: string;
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
  }
}, {
  sequelize,
  tableName: 'stages',
  underscored: true,
  timestamps: false
});
