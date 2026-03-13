import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Patient extends Model {
  public id!: number;
  public mrn!: string;
  public first_name!: string;
  public last_name!: string;
  public date_of_birth!: Date | null;
  public gender!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
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
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'patients',
  underscored: true
});
