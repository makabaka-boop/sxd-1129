import { store } from '../store';
import { getOverdueRecords, getNegativeQuantityRecords, getLongNoteRecords, MAX_NOTE_LENGTH } from '../utils/validation';
import { getStatusLabel, getStatusClass } from '../utils/format';

export class AuditPage {
  private container: HTMLElement;
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="audit-page">
        <div class="page-header">
          <h2>审计视图</h2>
          <p class="page-subtitle">查看异常记录（只读视图，不可修改）</p>
        </div>
        <div id="audit-content"></div>
      </div>
    `;

    this.unsubscribe = store.subscribe(() => this.renderContent());
    this.renderContent();
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private renderContent(): void {
    const content = this.container.querySelector('#audit-content') as HTMLElement;
    if (!content) return;

    const state = store.getState();
    const overdueRecords = getOverdueRecords(state.records);
    const negativeRecords = getNegativeQuantityRecords(state.records);
    const longNoteRecords = getLongNoteRecords(state.records);

    const totalAnomalies = overdueRecords.length + negativeRecords.length + longNoteRecords.length;

    content.innerHTML = `
      <div class="audit-summary">
        <div class="summary-card warning">
          <div class="summary-count">${overdueRecords.length}</div>
          <div class="summary-label">超期未还</div>
        </div>
        <div class="summary-card danger">
          <div class="summary-count">${negativeRecords.length}</div>
          <div class="summary-label">数量异常</div>
        </div>
        <div class="summary-card info">
          <div class="summary-count">${longNoteRecords.length}</div>
          <div class="summary-label">备注过长</div>
        </div>
        <div class="summary-card total">
          <div class="summary-count">${totalAnomalies}</div>
          <div class="summary-label">异常总数</div>
        </div>
      </div>

      <div class="audit-section">
        <h3 class="section-title warning-title">超期未还记录</h3>
        ${this.renderRecordsTable(overdueRecords, state, 'overdue')}
      </div>

      <div class="audit-section">
        <h3 class="section-title danger-title">数量异常记录（负数）</h3>
        ${this.renderRecordsTable(negativeRecords, state, 'negative')}
      </div>

      <div class="audit-section">
        <h3 class="section-title info-title">备注过长记录（超过 ${MAX_NOTE_LENGTH} 字符）</h3>
        ${this.renderRecordsTable(longNoteRecords, state, 'long_note')}
      </div>
    `;
  }

  private renderRecordsTable(records: any[], state: any, type: string): string {
    if (records.length === 0) {
      return '<div class="empty-state">暂无异常记录</div>';
    }

    return `
      <div class="audit-table-wrapper">
        <table class="audit-table">
          <thead>
            <tr>
              <th>器材名称</th>
              <th>科室</th>
              <th>领用人</th>
              <th>数量</th>
              <th>领用日期</th>
              <th>预计归还</th>
              <th>实际归还</th>
              <th>状态</th>
              ${type === 'long_note' ? '<th>备注长度</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${records
              .map(record => {
                const equip = state.equipmentTypes.find((e: any) => e.id === record.equipmentTypeId);
                const dept = state.departments.find((d: any) => d.id === record.departmentId);
                return `
                  <tr>
                    <td>${equip?.name || '未知'}</td>
                    <td>${dept?.name || '未知'}</td>
                    <td>${record.borrower}</td>
                    <td class="${type === 'negative' ? 'text-danger' : ''}">${record.quantity}</td>
                    <td>${record.borrowDate}</td>
                    <td>${record.expectedReturnDate}</td>
                    <td>${record.actualReturnDate || '-'}</td>
                    <td><span class="status-badge ${getStatusClass(record.status)}">${getStatusLabel(record.status)}</span></td>
                    ${type === 'long_note' ? `<td class="text-warning">${record.disinfectionNote.length}/${MAX_NOTE_LENGTH}</td>` : ''}
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}
