import type { AppState, EquipmentType, Department, EquipmentRecord, TableConfig, User } from '../types';

const STORAGE_KEYS = {
  STATE: 'med_equip_state',
  CURRENT_USER: 'med_equip_current_user',
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const defaultColumns = [
  { id: 'c1', key: 'equipmentName', label: '器材名称', width: 150, visible: true, editable: false, type: 'text' as const },
  { id: 'c2', key: 'departmentName', label: '科室', width: 120, visible: true, editable: true, type: 'select' as const },
  { id: 'c3', key: 'borrower', label: '领用人', width: 100, visible: true, editable: true, type: 'text' as const },
  { id: 'c4', key: 'quantity', label: '数量', width: 80, visible: true, editable: true, type: 'number' as const },
  { id: 'c5', key: 'borrowDate', label: '领用日期', width: 120, visible: true, editable: true, type: 'date' as const },
  { id: 'c6', key: 'expectedReturnDate', label: '预计归还', width: 120, visible: true, editable: true, type: 'date' as const },
  { id: 'c7', key: 'actualReturnDate', label: '实际归还', width: 120, visible: true, editable: true, type: 'date' as const },
  { id: 'c8', key: 'disinfectionNote', label: '消毒备注', width: 200, visible: true, editable: true, type: 'text' as const },
  { id: 'c9', key: 'feeMarked', label: '费用标记', width: 100, visible: true, editable: true, type: 'number' as const },
  { id: 'c10', key: 'status', label: '状态', width: 100, visible: true, editable: true, type: 'status' as const },
];

const defaultEquipmentTypes: EquipmentType[] = [
  { id: 'e1', name: '听诊器', unit: '个', defaultQuantity: 1, dailyRate: 5 },
  { id: 'e2', name: '血压计', unit: '台', defaultQuantity: 1, dailyRate: 10 },
  { id: 'e3', name: '体温计', unit: '支', defaultQuantity: 5, dailyRate: 2 },
  { id: 'e4', name: '输液架', unit: '个', defaultQuantity: 2, dailyRate: 8 },
  { id: 'e5', name: '氧气袋', unit: '个', defaultQuantity: 1, dailyRate: 15 },
];

const defaultDepartments: Department[] = [
  { id: 'd1', name: '内科' },
  { id: 'd2', name: '外科' },
  { id: 'd3', name: '儿科' },
  { id: 'd4', name: '妇产科' },
  { id: 'd5', name: '急诊科' },
];

const defaultRecords: EquipmentRecord[] = [
  {
    id: 'r1',
    equipmentTypeId: 'e1',
    departmentId: 'd1',
    borrower: '张医生',
    quantity: 2,
    borrowDate: '2026-06-01',
    expectedReturnDate: '2026-06-03',
    disinfectionNote: '已消毒',
    feeMarked: 20,
    status: 'returned',
    actualReturnDate: '2026-06-03',
    createdAt: '2026-06-01T09:00:00',
    updatedAt: '2026-06-03T14:00:00',
  },
  {
    id: 'r2',
    equipmentTypeId: 'e2',
    departmentId: 'd2',
    borrower: '李护士',
    quantity: 1,
    borrowDate: '2026-06-04',
    expectedReturnDate: '2026-06-05',
    disinfectionNote: '',
    feeMarked: 0,
    status: 'overdue',
    createdAt: '2026-06-04T10:00:00',
    updatedAt: '2026-06-04T10:00:00',
  },
];

const defaultTableConfig: TableConfig = {
  columns: defaultColumns,
  sortKey: null,
  sortOrder: null,
};

const defaultState: AppState = {
  currentUser: null,
  equipmentTypes: defaultEquipmentTypes,
  departments: defaultDepartments,
  records: defaultRecords,
  tableConfig: defaultTableConfig,
};

const mockUsers: User[] = [
  { id: 'u1', name: '管理员', role: 'admin' },
  { id: 'u2', name: '王护士', role: 'user' },
  { id: 'u3', name: '赵审计', role: 'auditor' },
];

export const getMockUsers = (): User[] => mockUsers;

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STATE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return { ...defaultState };
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
};

export const loadCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load current user:', e);
  }
  return null;
};

export const saveCurrentUser = (user: User | null): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save current user:', e);
  }
};

export const resetState = (): void => {
  localStorage.removeItem(STORAGE_KEYS.STATE);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

export { generateId };
