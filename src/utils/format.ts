import type { RecordStatus, EquipmentRecord, EquipmentType } from '../types';

export const getStatusLabel = (status: RecordStatus): string => {
  const labels: Record<RecordStatus, string> = {
    borrowed: '领用中',
    returned: '已归还',
    overdue: '已超期',
    extended: '已延期',
  };
  return labels[status];
};

export const getStatusClass = (status: RecordStatus): string => {
  const classes: Record<RecordStatus, string> = {
    borrowed: 'status-borrowed',
    returned: 'status-returned',
    overdue: 'status-overdue',
    extended: 'status-extended',
  };
  return classes[status];
};

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: '管理员',
    user: '普通用户',
    auditor: '审计员',
  };
  return labels[role] || role;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  return dateStr;
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const calculateBorrowDays = (borrowDate: string, returnDate: string): number => {
  const start = new Date(borrowDate);
  const end = new Date(returnDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

export const calculateFee = (
  record: EquipmentRecord,
  equipmentType: EquipmentType | undefined,
  actualReturnDate: string
): number => {
  if (!equipmentType) return 0;
  const days = calculateBorrowDays(record.borrowDate, actualReturnDate);
  return days * equipmentType.dailyRate * record.quantity;
};

export const canReturn = (status: RecordStatus): boolean => {
  return status === 'borrowed' || status === 'overdue' || status === 'extended';
};

export const canExtend = (status: RecordStatus): boolean => {
  return status === 'borrowed' || status === 'overdue' || status === 'extended';
};
