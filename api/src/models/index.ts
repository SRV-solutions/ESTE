import Blueprint from './Blueprint';
import Category from './Category';
import CheckIn from './CheckIn';
import Company from './Company';
import Employee from './Employee';
import Event from './Event';
import Feedback from './Feedback';
import Invoice from './Invoice';
import Item from './Item';
import Payment from './Payment';
import Location from './Location';
import PasswordResetToken from './PasswordResetToken';
import Payslip from './Payslip';
import Permission from './Permission';
import Role from './Role';
import RolePermission from './RolePermission';
import ServiceOrder from './ServiceOrder';
import ServiceOrderItem from './ServiceOrderItem';
import ServiceOrderStoreItem from './ServiceOrderStoreItem';
import StoreItem from './StoreItem';
import User from './User';

// Todas las asociaciones en un solo lugar: los modelos no se importan entre sí.

Company.hasMany(User, { foreignKey: 'companyId' });
User.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Payment, { foreignKey: 'companyId' });
Payment.belongsTo(Company, { foreignKey: 'companyId' });
Payment.hasOne(Invoice, { foreignKey: 'paymentId' });
Invoice.belongsTo(Payment, { foreignKey: 'paymentId' });
Company.hasMany(Invoice, { foreignKey: 'companyId' });
Invoice.belongsTo(Company, { foreignKey: 'companyId' });
Feedback.belongsTo(Company, { foreignKey: 'companyId' });
Feedback.belongsTo(User, { foreignKey: 'userId' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId' });

Blueprint.belongsTo(Event, { foreignKey: 'eventId' });
Blueprint.belongsTo(User, { foreignKey: 'uploadedBy', as: 'Uploader' });
Event.hasMany(Blueprint, { foreignKey: 'eventId' });

CheckIn.belongsTo(ServiceOrder, { foreignKey: 'serviceOrderId' });
CheckIn.belongsTo(User, { foreignKey: 'userId' });
ServiceOrder.hasMany(CheckIn, { foreignKey: 'serviceOrderId' });

Employee.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Employee, { foreignKey: 'userId' });
Employee.hasMany(Payslip, { foreignKey: 'employeeId' });
Payslip.belongsTo(Employee, { foreignKey: 'employeeId' });

Role.hasMany(User, { foreignKey: 'roleId' });
User.belongsTo(Role, { foreignKey: 'roleId' });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', otherKey: 'permissionId' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', otherKey: 'roleId' });

Location.hasMany(Event, { foreignKey: 'locationId' });
Event.belongsTo(Location, { foreignKey: 'locationId' });
Event.hasMany(ServiceOrder, { foreignKey: 'eventId' });

Category.hasMany(Item, { foreignKey: 'categoryId' });
Item.belongsTo(Category, { foreignKey: 'categoryId' });
Item.belongsTo(User, { foreignKey: 'ownerId', as: 'Owner' });

ServiceOrder.belongsTo(Event, { foreignKey: 'eventId', as: 'Event' });
ServiceOrder.belongsTo(User, { foreignKey: 'orderedBy', as: 'OrderedBy' });
ServiceOrder.belongsTo(User, { foreignKey: 'checkedBy', as: 'CheckedBy' });
ServiceOrder.belongsTo(User, { foreignKey: 'deployedBy', as: 'DeployedBy' });
ServiceOrder.belongsTo(User, { foreignKey: 'logisticsBy', as: 'LogisticsBy' });
ServiceOrder.belongsTo(User, { foreignKey: 'receptionBy', as: 'ReceptionBy' });
ServiceOrder.belongsTo(ServiceOrder, { foreignKey: 'transferredToId', as: 'TransferredTo' });
ServiceOrder.hasMany(ServiceOrderItem, { foreignKey: 'serviceOrderId' });
ServiceOrder.hasMany(ServiceOrderStoreItem, { foreignKey: 'serviceOrderId' });

ServiceOrderItem.belongsTo(ServiceOrder, { foreignKey: 'serviceOrderId' });
ServiceOrderItem.belongsTo(Item, { foreignKey: 'itemId' });
Item.hasMany(ServiceOrderItem, { foreignKey: 'itemId' });

ServiceOrderStoreItem.belongsTo(ServiceOrder, { foreignKey: 'serviceOrderId' });
ServiceOrderStoreItem.belongsTo(Item, { foreignKey: 'itemIdParent', as: 'Parent' });
ServiceOrderStoreItem.belongsTo(Item, { foreignKey: 'itemIdChild', as: 'Child' });

StoreItem.belongsTo(Item, { foreignKey: 'itemIdParent', as: 'Parent' });
StoreItem.belongsTo(Item, { foreignKey: 'itemIdChild', as: 'Child' });
Item.hasMany(StoreItem, { foreignKey: 'itemIdParent', as: 'PermanentContents' });

export {
  Blueprint,
  Category,
  CheckIn,
  Company,
  Employee,
  Event,
  Feedback,
  Invoice,
  Item,
  Payment,
  Location,
  PasswordResetToken,
  Payslip,
  Permission,
  Role,
  RolePermission,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderStoreItem,
  StoreItem,
  User,
};
