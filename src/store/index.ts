import type { AppState, User, EquipmentType, Department, EquipmentRecord, TableConfig, ColumnConfig, ExtensionRecord, ExtensionConfig } from '../types';
import { loadState, saveState, loadCurrentUser, saveCurrentUser, generateId } from '../utils/storage';
import { validateAllRecords } from '../utils/validation';
import { calculateFee } from '../utils/format';

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
      if (!record.actualReturnDate) {
        if (record.expectedReturnDate < today) {
          return { ...record, status: 'overdue' as const };
        } else if (record.extensionCount > 0) {
          return { ...record, status: 'extended' as const };
        }
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

  addRecord(record: Omit<EquipmentRecord, 'id' | 'createdAt' | 'updatedAt' | 'extensionCount' | 'extensionHistory'>): void {
    const now = new Date().toISOString();
    const newRecord: EquipmentRecord = {
      ...record,
      id: generateId(),
      extensionCount: 0,
      extensionHistory: [],
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

  returnRecord(id: string, actualReturnDate: string): void {
    const record = this.state.records.find(r => r.id === id);
    if (!record) return;

    const equipmentType = this.state.equipmentTypes.find(e => e.id === record.equipmentTypeId);
    const fee = calculateFee(record, equipmentType, actualReturnDate);

    const now = new Date().toISOString();
    this.state.records = this.state.records.map(r =>
      r.id === id
        ? {
            ...r,
            actualReturnDate,
            status: 'returned' as const,
            feeMarked: fee,
            updatedAt: now,
          }
        : r
    );
    this.persist();
    this.notify();
  }

  extendRecord(recordId: string, newExpectedDate: string, reason: string): { success: boolean; message: string } {
    const record = this.state.records.find(r => r.id === recordId);
    if (!record) {
      return { success: false, message: '记录不存在' };
    }

    if (record.status === 'returned') {
      return { success: false, message: '已归还的记录不能延期' };
    }

    const config = this.state.extensionConfig;
    
    if (record.extensionCount >= config.maxExtensionTimes) {
      return { success: false, message: `已达到最大延期次数限制 (${config.maxExtensionTimes} 次)` };
    }

    const oldDate = new Date(record.expectedReturnDate);
    const newDate = new Date(newExpectedDate);
    const diffDays = Math.ceil((newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { success: false, message: '新的预计归还日期必须晚于当前预计归还日期' };
    }

    if (diffDays > config.maxExtensionDays) {
      return { success: false, message: `单次延期天数不能超过 ${config.maxExtensionDays} 天` };
    }

    const currentUser = this.state.currentUser;
    const extensionRecord: ExtensionRecord = {
      id: generateId(),
      oldExpectedDate: record.expectedReturnDate,
      newExpectedDate: newExpectedDate,
      reason,
      operatorId: currentUser?.id || '',
      operatorName: currentUser?.name || '未知',
      createdAt: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    this.state.records = this.state.records.map(r =>
      r.id === recordId
        ? {
            ...r,
            expectedReturnDate: newExpectedDate,
            extensionCount: r.extensionCount + 1,
            extensionHistory: [...r.extensionHistory, extensionRecord],
            latestExtensionReason: reason,
            status: 'extended' as const,
            updatedAt: now,
          }
        : r
    );

    this.updateOverdueStatus();
    this.notify();
    return { success: true, message: '延期成功' };
  }

  getExtensionConfig(): ExtensionConfig {
    return { ...this.state.extensionConfig };
  }

  updateExtensionConfig(config: Partial<ExtensionConfig>): void {
    this.state.extensionConfig = { ...this.state.extensionConfig, ...config };
    this.persist();
    this.notify();
  }

  canExtend(recordId: string): { canExtend: boolean; reason?: string } {
    const record = this.state.records.find(r => r.id === recordId);
    if (!record) {
      return { canExtend: false, reason: '记录不存在' };
    }

    if (record.status === 'returned') {
      return { canExtend: false, reason: '已归还的记录不能延期' };
    }

    const config = this.state.extensionConfig;
    if (record.extensionCount >= config.maxExtensionTimes) {
      return { canExtend: false, reason: `已达到最大延期次数限制 (${config.maxExtensionTimes} 次)` };
    }

    return { canExtend: true };
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
    return validateAllRecords(this.state.records, this.state.extensionConfig);
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
