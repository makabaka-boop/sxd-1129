export type UserRole = 'admin' | 'user' | 'auditor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface EquipmentType {
  id: string;
  name: string;
  unit: string;
  defaultQuantity: number;
  dailyRate: number;
}

export interface Department {
  id: string;
  name: string;
}

export type RecordStatus = 'borrowed' | 'returned' | 'overdue';

export interface EquipmentRecord {
  id: string;
  equipmentTypeId: string;
  departmentId: string;
  borrower: string;
  quantity: number;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  disinfectionNote: string;
  feeMarked: number;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnConfig {
  id: string;
  key: string;
  label: string;
  width: number;
  visible: boolean;
  editable: boolean;
  type: 'text' | 'number' | 'date' | 'select' | 'status';
  options?: { value: string; label: string }[];
}

export interface TableConfig {
  columns: ColumnConfig[];
  sortKey: string | null;
  sortOrder: 'asc' | 'desc' | null;
}

export interface AppState {
  currentUser: User | null;
  equipmentTypes: EquipmentType[];
  departments: Department[];
  records: EquipmentRecord[];
  tableConfig: TableConfig;
}

export type ValidationError = {
  type: 'overdue' | 'negative_quantity' | 'long_note';
  recordId: string;
  message: string;
};
