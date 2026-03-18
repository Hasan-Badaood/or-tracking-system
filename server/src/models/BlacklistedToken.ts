import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class BlacklistedToken extends Model {
  public id!: number;
  public token!: string;
  public expires_at!: Date;
  public readonly created_at!: Date;
}

BlacklistedToken.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'blacklisted_tokens',
  underscored: true,
  updatedAt: false,
});
