import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class SystemSetting extends Model {
  public key!: string;
  public value!: string | null;
}

SystemSetting.init(
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'system_settings',
    timestamps: false,
  }
);
