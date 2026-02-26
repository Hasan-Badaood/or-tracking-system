import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class FamilyToken extends Model {
  public id!: number;
  public family_contact_id!: number;
  public visit_id!: number;
  public token!: string;
  public otp!: string;
  public otp_expires_at!: Date;
  public otp_attempts!: number;
  public token_expires_at!: Date;
  public is_locked!: boolean;
  public locked_until!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

FamilyToken.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  family_contact_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  visit_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: false
  },
  otp_expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  otp_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  token_expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'family_tokens',
  underscored: true
});
