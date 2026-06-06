import type { ColumnConfig, EquipmentRecord, ValidationError } from '../types';
import { store } from '../store';
import { getStatusLabel, getStatusClass } from '../utils/format';

interface TableRowData {
  id: string;
  equipmentName: string;
  departmentName: string;
  borrower: string;
  quantity: number;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate: string;
  disinfectionNote: string;
  feeMarked: number;
  status: string;
  equipmentTypeId: string;
  departmentId: string;
}

export class ResizableTable {
  private container: HTMLElement;
  private columns: ColumnConfig[];
  private records: EquipmentRecord[];
  private externalRecords: EquipmentRecord[] | null = null;
  private errors: ValidationError[];
  private editingCell: { rowId: string; colKey: string } | null = null;
  private resizingCol: string | null = null;
  private startX = 0;
  private startWidth = 0;
  private onCellEdit: (recordId: string, key: string, value: any) => void;
  private onDelete?: (recordId: string) => void;
  private canEdit: boolean;

  constructor(
    container: HTMLElement,
    options: {
      onCellEdit: (recordId: string, key: string, value: any) => void;
      onDelete?: (recordId: string) => void;
      canEdit: boolean;
    }
  ) {
    this.container = container;
    this.onCellEdit = options.onCellEdit;
    this.onDelete = options.onDelete;
    this.canEdit = options.canEdit;
    const state = store.getState();
    this.columns = state.tableConfig.columns.filter(c => c.visible);
    this.records = this.applySorting(state.records);
    this.errors = store.getValidationErrors();
    this.bindEvents();
  }

  private bindEvents(): void {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('click', this.handleDocumentClick);
  }

  public destroy(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('click', this.handleDocumentClick);
  }

  public setExternalRecords(records: EquipmentRecord[] | null): void {
    this.externalRecords = records;
    this.refresh();
  }

  public refresh(): void {
    const state = store.getState();
    this.columns = state.tableConfig.columns.filter(c => c.visible);
    const sourceRecords = this.externalRecords || state.records;
    this.records = this.applySorting(sourceRecords);
    this.errors = store.getValidationErrors();
    this.render();
  }

  private applySorting(records: EquipmentRecord[]): EquipmentRecord[] {
    const state = store.getState();
    const { sortKey, sortOrder } = state.tableConfig;
    if (!sortKey || !sortOrder) return records;

    return [...records].sort((a, b) => {
      const aVal = this.getRowData(a)[sortKey as keyof TableRowData];
      const bVal = this.getRowData(b)[sortKey as keyof TableRowData];
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private getRowData(record: EquipmentRecord): TableRowData {
    const state = store.getState();
    const equipment = state.equipmentTypes.find(e => e.id === record.equipmentTypeId);
    const department = state.departments.find(d => d.id === record.departmentId);
    return {
      id: record.id,
      equipmentName: equipment?.name || '未知',
      departmentName: department?.name || '未知',
      borrower: record.borrower,
      quantity: record.quantity,
      borrowDate: record.borrowDate,
      expectedReturnDate: record.expectedReturnDate,
      actualReturnDate: record.actualReturnDate || '',
      disinfectionNote: record.disinfectionNote,
      feeMarked: record.feeMarked,
      status: record.status,
      equipmentTypeId: record.equipmentTypeId,
      departmentId: record.departmentId,
    };
  }

  private getRecordErrors(recordId: string): ValidationError[] {
    return this.errors.filter(e => e.recordId === recordId);
  }

  public render(): void {
    const headerRow = this.columns
      .map(col => {
        const state = store.getState();
        const isSorted = state.tableConfig.sortKey === col.key;
        const sortIcon = isSorted
          ? state.tableConfig.sortOrder === 'asc'
            ? ' ▲'
            : ' ▼'
          : '';
        return `
          <th class="resizable-th" data-col-id="${col.id}" data-col-key="${col.key}" style="width: ${col.width}px;">
            <span class="th-content">${col.label}${sortIcon}</span>
            <div class="resize-handle" data-col-id="${col.id}"></div>
          </th>
        `;
      })
      .join('');

    const deleteHeader = this.onDelete && this.canEdit ? '<th class="action-th" style="width: 60px;">操作</th>' : '';

    const bodyRows = this.records
      .map(record => {
        const rowData = this.getRowData(record);
        const recordErrors = this.getRecordErrors(record.id);
        const hasError = recordErrors.length > 0;
        const errorTitle = recordErrors.map(e => e.message).join('\n');

        const cells = this.columns
          .map(col => {
            const value = rowData[col.key as keyof TableRowData];
            const displayValue = this.formatCellValue(col, value, record);
            const isEditing = this.editingCell?.rowId === record.id && this.editingCell?.colKey === col.key;
            const cellClass = hasError ? ' has-error' : '';
            const isEditable = this.canEdit && col.editable;

            if (isEditing) {
              return `
                <td class="editable-cell editing" data-row-id="${record.id}" data-col-key="${col.key}" style="width: ${col.width}px;">
                  ${this.renderEditor(col, record, value)}
                </td>
              `;
            }

            return `
              <td 
                class="editable-cell${isEditable ? ' can-edit' : ''}${cellClass}" 
                data-row-id="${record.id}" 
                data-col-key="${col.key}" 
                style="width: ${col.width}px;"
                ${hasError ? `title="${errorTitle}"` : ''}
              >
                ${displayValue}
              </td>
            `;
          })
          .join('');

        const deleteCell =
          this.onDelete && this.canEdit
            ? `<td class="action-cell"><button class="btn-delete" data-record-id="${record.id}">删除</button></td>`
            : '';

        return `<tr data-row-id="${record.id}"${hasError ? ' class="error-row"' : ''}>${cells}${deleteCell}</tr>`;
      })
      .join('');

    this.container.innerHTML = `
      <div class="table-wrapper">
        <table class="resizable-table">
          <thead>
            <tr>${headerRow}${deleteHeader}</tr>
          </thead>
          <tbody>
            ${bodyRows || '<tr><td colspan="' + (this.columns.length + 1) + '" class="empty-state">暂无数据</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    this.attachTableEvents();
  }

  private formatCellValue(col: ColumnConfig, value: any, record: EquipmentRecord): string {
    if (col.key === 'status') {
      return `<span class="status-badge ${getStatusClass(record.status)}">${getStatusLabel(record.status)}</span>`;
    }
    if (col.type === 'number' && value === 0) {
      return '<span class="muted">0</span>';
    }
    if (!value && col.type === 'date') {
      return '<span class="muted">-</span>';
    }
    if (!value && col.key === 'disinfectionNote') {
      return '<span class="muted">-</span>';
    }
    return String(value);
  }

  private renderEditor(col: ColumnConfig, record: EquipmentRecord, currentValue: any): string {
    const state = store.getState();

    switch (col.key) {
      case 'departmentName':
        const options = state.departments
          .map(d => `<option value="${d.id}" ${d.id === record.departmentId ? 'selected' : ''}>${d.name}</option>`)
          .join('');
        return `<select class="cell-editor" data-type="select">${options}</select>`;

      case 'quantity':
      case 'feeMarked':
        return `<input type="number" class="cell-editor" data-type="number" value="${currentValue}" min="${col.key === 'feeMarked' ? 0 : -999}">`;

      case 'borrowDate':
      case 'expectedReturnDate':
      case 'actualReturnDate':
        return `<input type="date" class="cell-editor" data-type="date" value="${currentValue || ''}">`;

      case 'status':
        const statusOptions = [
          { value: 'borrowed', label: '领用中' },
          { value: 'returned', label: '已归还' },
          { value: 'overdue', label: '已超期' },
        ]
          .map(s => `<option value="${s.value}" ${s.value === currentValue ? 'selected' : ''}>${s.label}</option>`)
          .join('');
        return `<select class="cell-editor" data-type="status">${statusOptions}</select>`;

      case 'disinfectionNote':
        return `<input type="text" class="cell-editor" data-type="text" value="${currentValue || ''}" maxlength="500">`;

      default:
        return `<input type="text" class="cell-editor" data-type="text" value="${currentValue || ''}">`;
    }
  }

  private attachTableEvents(): void {
    this.container.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e: Event) => this.handleResizeStart(e as MouseEvent));
    });

    this.container.querySelectorAll('.th-content').forEach(header => {
      header.addEventListener('click', (e: Event) => {
        const th = (e.target as HTMLElement).closest('.resizable-th');
        const colKey = th?.getAttribute('data-col-key');
        if (colKey) this.handleSort(colKey);
      });
    });

    this.container.querySelectorAll('.editable-cell.can-edit').forEach(cell => {
      cell.addEventListener('dblclick', (e: Event) => {
        const rowId = (cell as HTMLElement).getAttribute('data-row-id');
        const colKey = (cell as HTMLElement).getAttribute('data-col-key');
        if (rowId && colKey) {
          this.startEditing(rowId, colKey);
        }
      });
    });

    this.container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const recordId = (btn as HTMLElement).getAttribute('data-record-id');
        if (recordId && this.onDelete) {
          if (confirm('确定要删除这条记录吗？')) {
            this.onDelete(recordId);
          }
        }
      });
    });

    const editor = this.container.querySelector('.cell-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      if (editor instanceof HTMLInputElement) {
        editor.select();
      }
      editor.addEventListener('blur', () => this.commitEdit());
      editor.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          (e.target as HTMLElement).blur();
        }
        if (e.key === 'Escape') {
          this.cancelEdit();
        }
      });
    }
  }

  private handleResizeStart(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const colId = (e.target as HTMLElement).getAttribute('data-col-id');
    if (!colId) return;

    const col = store.getState().tableConfig.columns.find(c => c.id === colId);
    if (!col) return;

    this.resizingCol = colId;
    this.startX = e.clientX;
    this.startWidth = col.width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.resizingCol) return;

    const diff = e.clientX - this.startX;
    const newWidth = Math.max(60, this.startWidth + diff);
    store.updateColumn(this.resizingCol, { width: newWidth });
  };

  private handleMouseUp = (): void => {
    if (this.resizingCol) {
      this.resizingCol = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.refresh();
    }
  };

  private handleSort(colKey: string): void {
    const state = store.getState();
    const { sortKey, sortOrder } = state.tableConfig;

    let newOrder: 'asc' | 'desc' | null = 'asc';
    if (sortKey === colKey) {
      if (sortOrder === 'asc') newOrder = 'desc';
      else if (sortOrder === 'desc') newOrder = null;
    }

    store.updateTableConfig({
      sortKey: newOrder ? colKey : null,
      sortOrder: newOrder,
    });
  }

  private startEditing(rowId: string, colKey: string): void {
    if (this.editingCell) {
      this.commitEdit();
    }
    this.editingCell = { rowId, colKey };
    this.render();
  }

  private handleDocumentClick = (e: MouseEvent): void => {
    if (!this.editingCell) return;
    const target = e.target as HTMLElement;
    if (!target.closest('.editable-cell.editing')) {
      this.commitEdit();
    }
  };

  private commitEdit(): void {
    if (!this.editingCell) return;

    const editor = this.container.querySelector('.cell-editor') as HTMLInputElement | HTMLSelectElement;
    if (!editor) {
      this.cancelEdit();
      return;
    }

    let value: any = editor.value;
    const type = editor.getAttribute('data-type');

    if (type === 'number') {
      value = parseFloat(value) || 0;
    }

    const { rowId, colKey } = this.editingCell;
    this.editingCell = null;

    let updates: any = {};
    if (colKey === 'departmentName') {
      updates.departmentId = value;
    } else if (colKey === 'actualReturnDate') {
      updates.actualReturnDate = value || undefined;
      if (value) {
        updates.status = 'returned';
      } else {
        const record = (this.externalRecords || store.getState().records).find(r => r.id === rowId);
        if (record) {
          const today = new Date().toISOString().split('T')[0];
          if (record.expectedReturnDate < today) {
            updates.status = 'overdue';
          } else {
            updates.status = 'borrowed';
          }
        }
      }
    } else {
      updates[colKey] = value;
    }

    this.onCellEdit(rowId, colKey, updates);
  }

  private cancelEdit(): void {
    this.editingCell = null;
    this.render();
  }
}
