import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class FamilyContact extends Model {
  public id!: number;
  public visit_id!: number;
  public phone!: string;
  public name!: string;
  public relationship!: string;
  public email!: string | null;
  public consent_given!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

FamilyContact.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  visit_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  relationship: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  consent_given: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  sequelize,
  tableName: 'family_contacts',
  underscored: true
});
