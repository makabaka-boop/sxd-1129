import { store } from '../store';
import { getOverdueRecords, getNegativeQuantityRecords, getLongNoteRecords, MAX_NOTE_LENGTH, getUnsettledReturnRecords, getFeeAnomalyRecords, getExtendedRecords, getExtensionOverdueRecords, getFrequentExtensionRecords, FREQUENT_EXTENSION_THRESHOLD } from '../utils/validation';
import { getStatusLabel, getStatusClass, formatCurrency, calculateFee } from '../utils/format';

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
    const unsettledRecords = getUnsettledReturnRecords(state.records);
    const feeAnomalyRecords = getFeeAnomalyRecords(state.records, state.equipmentTypes);
    const extendedRecords = getExtendedRecords(state.records);
    const extensionOverdueRecords = getExtensionOverdueRecords(state.records);
    const frequentExtensionRecords = getFrequentExtensionRecords(state.records);

    const totalAnomalies = overdueRecords.length + negativeRecords.length + longNoteRecords.length + unsettledRecords.length + feeAnomalyRecords.length + extensionOverdueRecords.length + frequentExtensionRecords.length;

    content.innerHTML = `
      <div class="audit-summary">
        <div class="summary-card warning">
          <div class="summary-count">${overdueRecords.length}</div>
          <div class="summary-label">超期未还</div>
        </div>
        <div class="summary-card purple">
          <div class="summary-count">${extendedRecords.length}</div>
          <div class="summary-label">延期记录</div>
        </div>
        <div class="summary-card warning">
          <div class="summary-count">${extensionOverdueRecords.length}</div>
          <div class="summary-label">延期后超期</div>
        </div>
        <div class="summary-card caution">
          <div class="summary-count">${frequentExtensionRecords.length}</div>
          <div class="summary-label">频繁延期</div>
        </div>
        <div class="summary-card danger">
          <div class="summary-count">${negativeRecords.length}</div>
          <div class="summary-label">数量异常</div>
        </div>
        <div class="summary-card info">
          <div class="summary-count">${longNoteRecords.length}</div>
          <div class="summary-label">备注过长</div>
        </div>
        <div class="summary-card caution">
          <div class="summary-count">${unsettledRecords.length}</div>
          <div class="summary-label">未结算归还</div>
        </div>
        <div class="summary-card danger">
          <div class="summary-count">${feeAnomalyRecords.length}</div>
          <div class="summary-label">费用异常</div>
        </div>
        <div class="summary-card total">
          <div class="summary-count">${totalAnomalies}</div>
          <div class="summary-label">异常总数</div>
        </div>
      </div>

      <div class="audit-section">
        <h3 class="section-title purple-title">延期记录</h3>
        ${this.renderExtensionRecordsTable(extendedRecords, state, 'extended')}
      </div>

      <div class="audit-section">
        <h3 class="section-title warning-title">延期后仍超期记录</h3>
        ${this.renderExtensionRecordsTable(extensionOverdueRecords, state, 'extension_overdue')}
      </div>

      <div class="audit-section">
        <h3 class="section-title caution-title">频繁延期记录（${FREQUENT_EXTENSION_THRESHOLD} 次及以上）</h3>
        ${this.renderExtensionRecordsTable(frequentExtensionRecords, state, 'frequent_extension')}
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

      <div class="audit-section">
        <h3 class="section-title caution-title">未结算归还记录</h3>
        ${this.renderFeeRecordsTable(unsettledRecords, state, 'unsettled')}
      </div>

      <div class="audit-section">
        <h3 class="section-title danger-title">费用异常记录</h3>
        ${this.renderFeeRecordsTable(feeAnomalyRecords, state, 'fee_anomaly')}
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

  private renderFeeRecordsTable(records: any[], state: any, type: string): string {
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
              <th>实际归还</th>
              <th>状态</th>
              <th>标记费用</th>
              ${type === 'fee_anomaly' ? '<th>预期费用</th><th>差额</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${records
              .map(record => {
                const equip = state.equipmentTypes.find((e: any) => e.id === record.equipmentTypeId);
                const dept = state.departments.find((d: any) => d.id === record.departmentId);
                const expectedFee = type === 'fee_anomaly' && record.actualReturnDate
                  ? calculateFee(record, equip, record.actualReturnDate)
                  : 0;
                const diff = type === 'fee_anomaly' ? record.feeMarked - expectedFee : 0;
                return `
                  <tr>
                    <td>${equip?.name || '未知'}</td>
                    <td>${dept?.name || '未知'}</td>
                    <td>${record.borrower}</td>
                    <td>${record.quantity}</td>
                    <td>${record.borrowDate}</td>
                    <td>${record.actualReturnDate || '-'}</td>
                    <td><span class="status-badge ${getStatusClass(record.status)}">${getStatusLabel(record.status)}</span></td>
                    <td class="${type === 'unsettled' ? 'text-warning' : ''}">${formatCurrency(record.feeMarked || 0)}</td>
                    ${type === 'fee_anomaly' ? `<td>${formatCurrency(expectedFee)}</td><td class="text-danger">${formatCurrency(diff)}</td>` : ''}
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderExtensionRecordsTable(records: any[], state: any, type: string): string {
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
              <th>最新预计归还</th>
              <th>延期次数</th>
              <th>延期原因</th>
              <th>状态</th>
              ${type === 'frequent_extension' ? '<th>延期历史</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${records
              .map(record => {
                const equip = state.equipmentTypes.find((e: any) => e.id === record.equipmentTypeId);
                const dept = state.departments.find((d: any) => d.id === record.departmentId);
                const reasonPreview = record.latestExtensionReason 
                  ? (record.latestExtensionReason.length > 20 ? record.latestExtensionReason.substring(0, 20) + '...' : record.latestExtensionReason)
                  : '-';
                const historySummary = record.extensionHistory && record.extensionHistory.length > 0
                  ? record.extensionHistory.map((h: any) => `${h.oldExpectedDate}→${h.newExpectedDate}`).join('; ')
                  : '-';
                return `
                  <tr>
                    <td>${equip?.name || '未知'}</td>
                    <td>${dept?.name || '未知'}</td>
                    <td>${record.borrower}</td>
                    <td>${record.quantity}</td>
                    <td>${record.borrowDate}</td>
                    <td>${record.expectedReturnDate}</td>
                    <td class="text-warning">${record.extensionCount} 次</td>
                    <td title="${record.latestExtensionReason || ''}">${reasonPreview}</td>
                    <td><span class="status-badge ${getStatusClass(record.status)}">${getStatusLabel(record.status)}</span></td>
                    ${type === 'frequent_extension' ? `<td title="${historySummary}">${historySummary.length > 30 ? historySummary.substring(0, 30) + '...' : historySummary}</td>` : ''}
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
