import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class UserAuditLog extends Model {
  public id!: number;
  public performed_by_id!: number;
  public target_user_id!: number;
  public action!: string;       // e.g. 'create', 'update', 'password_reset', 'deactivate', 'activate'
  public changes!: string | null; // JSON string of changed fields
  public readonly createdAt!: Date;
  public readonly created_at!: Date;
}

UserAuditLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    performed_by_id: { type: DataTypes.INTEGER, allowNull: false },
    target_user_id:  { type: DataTypes.INTEGER, allowNull: false },
    action:          { type: DataTypes.STRING,  allowNull: false },
    changes:         { type: DataTypes.TEXT,    allowNull: true },
  },
  {
    sequelize,
    tableName: 'user_audit_logs',
    underscored: true,
    updatedAt: false,
  }
);
