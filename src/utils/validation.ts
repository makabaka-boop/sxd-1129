import type { EquipmentRecord, ValidationError, EquipmentType } from '../types';
import { calculateFee } from './format';

const MAX_NOTE_LENGTH = 200;

export const validateRecord = (record: EquipmentRecord): ValidationError[] => {
  const errors: ValidationError[] = [];
  const today = new Date().toISOString().split('T')[0];

  if (record.quantity < 0) {
    errors.push({
      type: 'negative_quantity',
      recordId: record.id,
      message: `数量不能为负数 (当前: ${record.quantity})`,
    });
  }

  if (!record.actualReturnDate && record.expectedReturnDate < today && record.status !== 'returned') {
    errors.push({
      type: 'overdue',
      recordId: record.id,
      message: `已超期未还 (预计: ${record.expectedReturnDate})`,
    });
  }

  if (record.disinfectionNote.length > MAX_NOTE_LENGTH) {
    errors.push({
      type: 'long_note',
      recordId: record.id,
      message: `备注过长 (${record.disinfectionNote.length}/${MAX_NOTE_LENGTH} 字符)`,
    });
  }

  return errors;
};

export const validateAllRecords = (records: EquipmentRecord[]): ValidationError[] => {
  return records.flatMap(record => validateRecord(record));
};

export const getOverdueRecords = (records: EquipmentRecord[]): EquipmentRecord[] => {
  const today = new Date().toISOString().split('T')[0];
  return records.filter(
    r => !r.actualReturnDate && r.expectedReturnDate < today && r.status !== 'returned'
  );
};

export const getNegativeQuantityRecords = (records: EquipmentRecord[]): EquipmentRecord[] => {
  return records.filter(r => r.quantity < 0);
};

export const getLongNoteRecords = (records: EquipmentRecord[]): EquipmentRecord[] => {
  return records.filter(r => r.disinfectionNote.length > MAX_NOTE_LENGTH);
};

export const getUnsettledReturnRecords = (records: EquipmentRecord[]): EquipmentRecord[] => {
  return records.filter(r => r.status === 'returned' && (!r.feeMarked || r.feeMarked <= 0));
};

export const getFeeAnomalyRecords = (
  records: EquipmentRecord[],
  equipmentTypes: EquipmentType[]
): EquipmentRecord[] => {
  return records.filter(r => {
    if (r.status !== 'returned' || !r.actualReturnDate) return false;
    const equipmentType = equipmentTypes.find(e => e.id === r.equipmentTypeId);
    const expectedFee = calculateFee(r, equipmentType, r.actualReturnDate);
    return Math.abs(r.feeMarked - expectedFee) > 0.01;
  });
};

export { MAX_NOTE_LENGTH };
