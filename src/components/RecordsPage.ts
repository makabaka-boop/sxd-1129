import { store } from '../store';
import { ResizableTable } from './ResizableTable';
import type { EquipmentRecord } from '../types';

export class RecordsPage {
  private container: HTMLElement;
  private table: ResizableTable | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    const canEdit = store.canEdit();

    this.container.innerHTML = `
      <div class="records-page">
        <div class="page-header">
          <h2>器材领用记录</h2>
          <div class="header-actions">
            <button class="btn btn-primary" id="btn-add-record" ${!canEdit ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
              + 新增领用记录
            </button>
            <button class="btn" id="btn-column-settings" ${!store.canManageSettings() ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
              列设置
            </button>
          </div>
        </div>
        <div class="page-filters">
          <div class="filter-item">
            <label>状态筛选：</label>
            <select id="filter-status">
              <option value="">全部</option>
              <option value="borrowed">领用中</option>
              <option value="returned">已归还</option>
              <option value="overdue">已超期</option>
            </select>
          </div>
          <div class="filter-item">
            <label>搜索：</label>
            <input type="text" id="search-input" placeholder="搜索器材名称、领用人、科室...">
          </div>
        </div>
        <div id="table-container" class="table-container"></div>
        <div class="page-tip">
          <span>提示：双击单元格可编辑内容 | 拖拽列标题右侧边缘可调整列宽 | 点击列标题可排序</span>
        </div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#table-container') as HTMLElement;
    this.table = new ResizableTable(tableContainer, {
      onCellEdit: (recordId, key, updates) => {
        store.updateRecord(recordId, updates);
      },
      onDelete: canEdit
        ? (recordId) => {
            store.deleteRecord(recordId);
          }
        : undefined,
      canEdit,
    });
    this.table.render();

    this.unsubscribe = store.subscribe(() => {
      this.applyFilters();
    });

    this.bindEvents();
  }

  public destroy(): void {
    this.table?.destroy();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private bindEvents(): void {
    const addBtn = this.container.querySelector('#btn-add-record');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddModal());
    }

    const columnSettingsBtn = this.container.querySelector('#btn-column-settings');
    if (columnSettingsBtn) {
      columnSettingsBtn.addEventListener('click', () => this.showColumnSettings());
    }

    const statusFilter = this.container.querySelector('#filter-status') as HTMLSelectElement;
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.applyFilters());
    }

    const searchInput = this.container.querySelector('#search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
  }

  private applyFilters(): void {
    const statusFilter = this.container.querySelector('#filter-status') as HTMLSelectElement;
    const searchInput = this.container.querySelector('#search-input') as HTMLInputElement;
    if (!statusFilter || !searchInput) return;

    const statusValue = statusFilter.value;
    const searchValue = searchInput.value.toLowerCase();

    let records = store.getState().records;

    if (statusValue) {
      records = records.filter(r => r.status === statusValue);
    }

    if (searchValue) {
      const state = store.getState();
      records = records.filter(r => {
        const equip = state.equipmentTypes.find(e => e.id === r.equipmentTypeId);
        const dept = state.departments.find(d => d.id === r.departmentId);
        return (
          equip?.name.toLowerCase().includes(searchValue) ||
          dept?.name.toLowerCase().includes(searchValue) ||
          r.borrower.toLowerCase().includes(searchValue)
        );
      });
    }

    const hasFilters = statusValue || searchValue;
    if (this.table) {
      this.table.setExternalRecords(hasFilters ? records : null);
    }
  }

  private showAddModal(): void {
    const state = store.getState();
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>新增领用记录</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>器材类型 *</label>
            <select id="new-equipment">
              ${state.equipmentTypes.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>科室 *</label>
            <select id="new-department">
              ${state.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>领用人 *</label>
            <input type="text" id="new-borrower" placeholder="请输入领用人姓名">
          </div>
          <div class="form-row">
            <label>数量 *</label>
            <input type="number" id="new-quantity" value="1" min="1">
          </div>
          <div class="form-row">
            <label>领用日期 *</label>
            <input type="date" id="new-borrow-date" value="${today}">
          </div>
          <div class="form-row">
            <label>预计归还日期 *</label>
            <input type="date" id="new-expected-date" value="${nextWeek}">
          </div>
          <div class="form-row">
            <label>消毒备注</label>
            <textarea id="new-note" rows="3" placeholder="请输入消毒备注"></textarea>
          </div>
          <div class="form-row">
            <label>费用标记</label>
            <input type="number" id="new-fee" value="0" min="0">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="btn-cancel">取消</button>
          <button class="btn btn-primary" id="btn-confirm">确认添加</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      document.body.removeChild(modal);
    };

    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.querySelector('#btn-cancel')?.addEventListener('click', close);
    modal.querySelector('.modal-overlay')?.addEventListener('click', (e: Event) => {
      if (e.target === modal) close();
    });

    modal.querySelector('#btn-confirm')?.addEventListener('click', () => {
      const equipmentId = (modal.querySelector('#new-equipment') as HTMLSelectElement).value;
      const departmentId = (modal.querySelector('#new-department') as HTMLSelectElement).value;
      const borrower = (modal.querySelector('#new-borrower') as HTMLInputElement).value.trim();
      const quantity = parseInt((modal.querySelector('#new-quantity') as HTMLInputElement).value) || 1;
      const borrowDate = (modal.querySelector('#new-borrow-date') as HTMLInputElement).value;
      const expectedDate = (modal.querySelector('#new-expected-date') as HTMLInputElement).value;
      const note = (modal.querySelector('#new-note') as HTMLTextAreaElement).value.trim();
      const fee = parseFloat((modal.querySelector('#new-fee') as HTMLInputElement).value) || 0;

      if (!borrower || !borrowDate || !expectedDate) {
        alert('请填写必填项');
        return;
      }

      const newRecord: Omit<EquipmentRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        equipmentTypeId: equipmentId,
        departmentId,
        borrower,
        quantity,
        borrowDate,
        expectedReturnDate: expectedDate,
        disinfectionNote: note,
        feeMarked: fee,
        status: 'borrowed',
      };

      store.addRecord(newRecord);
      close();
    });
  }

  private showColumnSettings(): void {
    const state = store.getState();
    const columns = state.tableConfig.columns;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>表格列设置</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-tip">勾选显示的列，可调整列宽度</p>
          <div class="column-settings-list">
            ${columns
              .map(
                (col, index) => `
              <div class="column-setting-item" data-col-id="${col.id}">
                <label>
                  <input type="checkbox" ${col.visible ? 'checked' : ''} data-col-id="${col.id}" class="col-visible">
                  ${col.label}
                </label>
                <div class="col-width-control">
                  <span>宽度:</span>
                  <input type="number" value="${col.width}" min="60" data-col-id="${col.id}" class="col-width">
                  <span>px</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="btn-cancel">取消</button>
          <button class="btn btn-primary" id="btn-save">保存设置</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      document.body.removeChild(modal);
    };

    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.querySelector('#btn-cancel')?.addEventListener('click', close);
    modal.querySelector('.modal-overlay')?.addEventListener('click', (e: Event) => {
      if (e.target === modal) close();
    });

    modal.querySelector('#btn-save')?.addEventListener('click', () => {
      const checkboxes = modal.querySelectorAll('.col-visible');
      const widthInputs = modal.querySelectorAll('.col-width');

      checkboxes.forEach(cb => {
        const colId = (cb as HTMLInputElement).getAttribute('data-col-id');
        if (colId) {
          store.updateColumn(colId, { visible: (cb as HTMLInputElement).checked });
        }
      });

      widthInputs.forEach(input => {
        const colId = (input as HTMLInputElement).getAttribute('data-col-id');
        const width = parseInt((input as HTMLInputElement).value);
        if (colId && !isNaN(width) && width >= 60) {
          store.updateColumn(colId, { width });
        }
      });

      close();
    });
  }
}
