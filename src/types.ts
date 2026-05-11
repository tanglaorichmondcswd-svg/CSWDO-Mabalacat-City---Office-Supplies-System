import { Timestamp } from 'firebase/firestore';

export type UserRole = 'User' | 'Admin' | 'System Admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  position: string;
  role: UserRole;
  createdAt: Timestamp;
}

export interface Budget {
  id: string;
  name: string;
  description: string;
  totalAmount: number;
  date: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface SubBudget {
  id: string;
  budgetId: string;
  name: string;
  description: string;
  totalAmount: number;
  targetDate: string;
  venue?: string;
  packs?: number;
  createdAt: Timestamp;
  createdBy: string;
}

export interface Item {
  id: string;
  itemId: string;
  category: string;
  description: string;
  uom: string;
  qty: number;
  qtyPerUom?: string;
  amount?: number;
  beginningInventory?: number;
  stockLevel?: number;
  createdAt: Timestamp;
}

export interface Delivery {
  id: string;
  itemId: string;
  category: string;
  description: string;
  uom: string;
  qty: number;
  dateDelivered: string;
  orNumber: string;
  receivedBy: string;
  createdAt: Timestamp;
}

export interface Request {
  id: string;
  itemId: string;
  category: string;
  description: string;
  uom: string;
  qty: number;
  requestedBy: string;
  dateRequested: string;
  unitDepartment: string;
  status: 'Pending' | 'Approved' | 'Released';
  releasedAt?: Timestamp;
  receivedBy?: string;
  createdAt: Timestamp;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: 'IN' | 'OUT';
  qty: number;
  referenceId: string;
  date: Timestamp;
}
