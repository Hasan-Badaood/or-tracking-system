import { Patient } from './Patient';
import { User } from './User';
import { Stage } from './Stage';
import { Visit } from './Visit';
import { ORRoom } from './ORRoom';
import { StageEvent } from './StageEvent';
import { FamilyContact } from './FamilyContact';
import { CleaningTimer } from './CleaningTimer';
import { FamilyToken } from './FamilyToken';
import { BlacklistedToken } from './BlacklistedToken';
import { SystemSetting } from './SystemSetting';
import { UserAuditLog } from './UserAuditLog';

// Define all relationships
Visit.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Visit.belongsTo(Stage, { foreignKey: 'current_stage_id', as: 'current_stage' });
Visit.belongsTo(ORRoom, { foreignKey: 'or_room_id', as: 'or_room' });
Visit.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });

StageEvent.belongsTo(Visit, { foreignKey: 'visit_id', as: 'visit' });
StageEvent.belongsTo(Stage, { foreignKey: 'from_stage_id', as: 'from_stage' });
StageEvent.belongsTo(Stage, { foreignKey: 'to_stage_id', as: 'to_stage' });
StageEvent.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });

FamilyContact.belongsTo(Visit, { foreignKey: 'visit_id', as: 'visit' });
Visit.hasMany(FamilyContact, { foreignKey: 'visit_id', as: 'family_contacts' });

CleaningTimer.belongsTo(ORRoom, { foreignKey: 'room_id', as: 'room' });
CleaningTimer.belongsTo(Visit, { foreignKey: 'visit_id', as: 'visit' });
ORRoom.hasOne(CleaningTimer, { foreignKey: 'room_id', as: 'cleaning_timer', scope: { completed: false } });

FamilyToken.belongsTo(FamilyContact, { foreignKey: 'family_contact_id', as: 'family_contact' });
FamilyToken.belongsTo(Visit, { foreignKey: 'visit_id', as: 'visit' });

ORRoom.belongsTo(Visit, { foreignKey: 'current_visit_id', as: 'current_visit' });

export {
  Patient,
  User,
  Stage,
  Visit,
  ORRoom,
  StageEvent,
  FamilyContact,
  CleaningTimer,
  FamilyToken,
  BlacklistedToken,
  SystemSetting,
  UserAuditLog,
};
