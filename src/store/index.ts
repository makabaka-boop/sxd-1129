import type { AppState, User, EquipmentType, Department, EquipmentRecord, TableConfig, ColumnConfig } from '../types';
import { loadState, saveState, loadCurrentUser, saveCurrentUser, generateId } from '../utils/storage';
import { validateAllRecords } from '../utils/validation';

class Store {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadState();
    const savedUser = loadCurrentUser();
    if (savedUser) {
      this.state.currentUser = savedUser;
    }
    this.updateOverdueStatus();
  }

  private updateOverdueStatus(): void {
    const today = new Date().toISOString().split('T')[0];
    this.state.records = this.state.records.map(record => {
      if (
        !record.actualReturnDate &&
        record.expectedReturnDate < today &&
        record.status === 'borrowed'
      ) {
        return { ...record, status: 'overdue' as const };
      }
      return record;
    });
    this.persist();
  }

  private persist(): void {
    saveState(this.state);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  getState(): AppState {
    return { ...this.state };
  }

  login(user: User): void {
    this.state.currentUser = user;
    saveCurrentUser(user);
    this.notify();
  }

  logout(): void {
    this.state.currentUser = null;
    saveCurrentUser(null);
    this.notify();
  }

  addEquipmentType(type: Omit<EquipmentType, 'id'>): void {
    const newType: EquipmentType = { ...type, id: generateId() };
    this.state.equipmentTypes = [...this.state.equipmentTypes, newType];
    this.persist();
    this.notify();
  }

  updateEquipmentType(id: string, updates: Partial<EquipmentType>): void {
    this.state.equipmentTypes = this.state.equipmentTypes.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    this.persist();
    this.notify();
  }

  deleteEquipmentType(id: string): void {
    this.state.equipmentTypes = this.state.equipmentTypes.filter(t => t.id !== id);
    this.persist();
    this.notify();
  }

  addDepartment(dept: Omit<Department, 'id'>): void {
    const newDept: Department = { ...dept, id: generateId() };
    this.state.departments = [...this.state.departments, newDept];
    this.persist();
    this.notify();
  }

  updateDepartment(id: string, updates: Partial<Department>): void {
    this.state.departments = this.state.departments.map(d =>
      d.id === id ? { ...d, ...updates } : d
    );
    this.persist();
    this.notify();
  }

  deleteDepartment(id: string): void {
    this.state.departments = this.state.departments.filter(d => d.id !== id);
    this.persist();
    this.notify();
  }

  addRecord(record: Omit<EquipmentRecord, 'id' | 'createdAt' | 'updatedAt'>): void {
    const now = new Date().toISOString();
    const newRecord: EquipmentRecord = {
      ...record,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    this.state.records = [...this.state.records, newRecord];
    this.persist();
    this.notify();
  }

  updateRecord(id: string, updates: Partial<EquipmentRecord>): void {
    const now = new Date().toISOString();
    this.state.records = this.state.records.map(r =>
      r.id === id ? { ...r, ...updates, updatedAt: now } : r
    );
    this.persist();
    this.notify();
  }

  deleteRecord(id: string): void {
    this.state.records = this.state.records.filter(r => r.id !== id);
    this.persist();
    this.notify();
  }

  updateTableConfig(config: Partial<TableConfig>): void {
    this.state.tableConfig = { ...this.state.tableConfig, ...config };
    this.persist();
    this.notify();
  }

  updateColumn(columnId: string, updates: Partial<ColumnConfig>): void {
    this.state.tableConfig.columns = this.state.tableConfig.columns.map(c =>
      c.id === columnId ? { ...c, ...updates } : c
    );
    this.persist();
    this.notify();
  }

  getValidationErrors() {
    return validateAllRecords(this.state.records);
  }

  canEdit(): boolean {
    return this.state.currentUser?.role === 'admin' || this.state.currentUser?.role === 'user';
  }

  canManageSettings(): boolean {
    return this.state.currentUser?.role === 'admin';
  }

  canViewAudit(): boolean {
    return this.state.currentUser?.role === 'admin' || this.state.currentUser?.role === 'auditor';
  }
}

export const store = new Store();
