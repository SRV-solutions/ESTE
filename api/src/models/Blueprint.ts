import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Event from './Event';
import type User from './User';

/** Plano (PDF, imagen o DWG) compartido con el equipo, opcionalmente asociado a un evento. */
class Blueprint extends Model {
  declare id: number;
  declare companyId: number;
  declare eventId: number | null;
  declare title: string;
  declare description: string | null;
  /** Clave del archivo en el almacenamiento privado (nunca una URL pública). */
  declare fileKey: string;
  declare fileName: string;
  declare mimeType: string;
  declare size: number;
  declare uploadedBy: number | null;
  declare createdAt: Date;
  declare Event?: Event;
  declare Uploader?: User;
}

Blueprint.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    eventId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    fileKey: { type: DataTypes.STRING(300), allowNull: false },
    fileName: { type: DataTypes.STRING(200), allowNull: false },
    mimeType: { type: DataTypes.STRING(80), allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: 'Blueprint', tableName: 'Blueprint', timestamps: true },
);

export default Blueprint;
