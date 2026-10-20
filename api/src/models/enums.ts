export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum Entity {
  SERVICE_ORDERS = 'serviceOrders',
  USERS = 'users',
  CATEGORIES = 'categories',
  ITEMS = 'items',
  EVENTS = 'events',
  LOCATIONS = 'locations',
  BLUEPRINTS = 'blueprints',
  PAYROLL = 'payroll',
  CHECKIN = 'checkin',
  REPORTS = 'reports',
}

export enum ServiceOrderStatus {
  Created = 'created', // Recién creada: la puede editar quien la creó
  InReview = 'in_review', // Esperando que alguien la revise
  Approved = 'approved', // Aprobada por quien la chequea
  Rejected = 'rejected', // Rechazada: vuelve a quien la creó para corregir
  InProcess = 'in_process', // El depósito está armando los ítems
  Ready = 'ready', // Armada y lista para cargar
  Dispatched = 'dispatched', // Despachada
  Delivered = 'delivered', // Entregada en el lugar del evento
  Returning = 'returning', // Volviendo al depósito
  Received = 'received', // Recibida en el depósito
  UnderReview = 'under_review', // Revisando el material devuelto
  Disassembled = 'disassembled', // Desarmada: cada ítem volvió a su lugar y queda libre
}
