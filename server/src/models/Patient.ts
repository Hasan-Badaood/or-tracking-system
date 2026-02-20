import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Patient extends Model {
  public id!: number;
  public mrn!: string;
  public first_name!: string;
  public last_name!: string;
}

Patient.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  mrn: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'patients',
  underscored: true
});
