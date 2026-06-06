import { store } from '../store';
import type { EquipmentType, Department } from '../types';

type TabType = 'equipment' | 'department';

export class AdminPage {
  private container: HTMLElement;
  private currentTab: TabType = 'equipment';
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="admin-page">
        <div class="page-header">
          <h2>系统管理</h2>
        </div>
        <div class="admin-tabs">
          <button class="tab-btn ${this.currentTab === 'equipment' ? 'active' : ''}" data-tab="equipment">
            器材类型管理
          </button>
          <button class="tab-btn ${this.currentTab === 'department' ? 'active' : ''}" data-tab="department">
            科室管理
          </button>
        </div>
        <div id="admin-tab-content"></div>
      </div>
    `;

    this.unsubscribe = store.subscribe(() => this.renderTabContent());

    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab') as TabType;
        if (tab && tab !== this.currentTab) {
          this.currentTab = tab;
          this.container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderTabContent();
        }
      });
    });

    this.renderTabContent();
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private renderTabContent(): void {
    const content = this.container.querySelector('#admin-tab-content') as HTMLElement;
    if (!content) return;

    if (this.currentTab === 'equipment') {
      this.renderEquipmentTab(content);
    } else {
      this.renderDepartmentTab(content);
    }
  }

  private renderEquipmentTab(container: HTMLElement): void {
    const state = store.getState();
    const equipmentTypes = state.equipmentTypes;

    container.innerHTML = `
      <div class="tab-content">
        <div class="tab-actions">
          <button class="btn btn-primary" id="btn-add-equipment">+ 新增器材类型</button>
        </div>
        <div class="settings-table-wrapper">
          <table class="settings-table">
            <thead>
              <tr>
                <th>器材名称</th>
                <th>单位</th>
                <th>默认数量</th>
                <th>每日费用(元)</th>
                <th style="width: 120px;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${equipmentTypes
                .map(
                  e => `
                <tr data-id="${e.id}">
                  <td><span class="cell-display" data-field="name">${e.name}</span></td>
                  <td><span class="cell-display" data-field="unit">${e.unit}</span></td>
                  <td><span class="cell-display" data-field="defaultQuantity">${e.defaultQuantity}</span></td>
                  <td><span class="cell-display" data-field="dailyRate">${e.dailyRate}</span></td>
                  <td>
                    <button class="btn-sm btn-edit" data-id="${e.id}">编辑</button>
                    <button class="btn-sm btn-delete" data-id="${e.id}">删除</button>
                  </td>
                </tr>
              `
                )
                .join('')}
              ${equipmentTypes.length === 0 ? '<tr><td colspan="5" class="empty-state">暂无器材类型</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelector('#btn-add-equipment')?.addEventListener('click', () => {
      this.showEquipmentModal();
    });

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const equipment = equipmentTypes.find(e => e.id === id);
        if (equipment) {
          this.showEquipmentModal(equipment);
        }
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id && confirm('确定要删除此器材类型吗？')) {
          store.deleteEquipmentType(id);
        }
      });
    });
  }

  private renderDepartmentTab(container: HTMLElement): void {
    const state = store.getState();
    const departments = state.departments;

    container.innerHTML = `
      <div class="tab-content">
        <div class="tab-actions">
          <button class="btn btn-primary" id="btn-add-department">+ 新增科室</button>
        </div>
        <div class="settings-table-wrapper">
          <table class="settings-table">
            <thead>
              <tr>
                <th>科室名称</th>
                <th style="width: 120px;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${departments
                .map(
                  d => `
                <tr data-id="${d.id}">
                  <td><span class="cell-display">${d.name}</span></td>
                  <td>
                    <button class="btn-sm btn-edit" data-id="${d.id}">编辑</button>
                    <button class="btn-sm btn-delete" data-id="${d.id}">删除</button>
                  </td>
                </tr>
              `
                )
                .join('')}
              ${departments.length === 0 ? '<tr><td colspan="2" class="empty-state">暂无科室</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelector('#btn-add-department')?.addEventListener('click', () => {
      this.showDepartmentModal();
    });

    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const dept = departments.find(d => d.id === id);
        if (dept) {
          this.showDepartmentModal(dept);
        }
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id && confirm('确定要删除此科室吗？')) {
          store.deleteDepartment(id);
        }
      });
    });
  }

  private showEquipmentModal(equipment?: EquipmentType): void {
    const isEdit = !!equipment;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? '编辑' : '新增'}器材类型</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>器材名称 *</label>
            <input type="text" id="equip-name" value="${equipment?.name || ''}" placeholder="请输入器材名称">
          </div>
          <div class="form-row">
            <label>单位 *</label>
            <input type="text" id="equip-unit" value="${equipment?.unit || '个'}" placeholder="个、台、支等">
          </div>
          <div class="form-row">
            <label>默认数量</label>
            <input type="number" id="equip-quantity" value="${equipment?.defaultQuantity || 1}" min="1">
          </div>
          <div class="form-row">
            <label>每日费用(元)</label>
            <input type="number" id="equip-rate" value="${equipment?.dailyRate || 0}" min="0" step="0.01">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="btn-cancel">取消</button>
          <button class="btn btn-primary" id="btn-confirm">${isEdit ? '保存' : '添加'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => document.body.removeChild(modal);

    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.querySelector('#btn-cancel')?.addEventListener('click', close);
    modal.querySelector('.modal-overlay')?.addEventListener('click', (e: Event) => {
      if (e.target === modal) close();
    });

    modal.querySelector('#btn-confirm')?.addEventListener('click', () => {
      const name = (modal.querySelector('#equip-name') as HTMLInputElement).value.trim();
      const unit = (modal.querySelector('#equip-unit') as HTMLInputElement).value.trim();
      const defaultQuantity = parseInt((modal.querySelector('#equip-quantity') as HTMLInputElement).value) || 1;
      const dailyRate = parseFloat((modal.querySelector('#equip-rate') as HTMLInputElement).value) || 0;

      if (!name || !unit) {
        alert('请填写必填项');
        return;
      }

      if (isEdit && equipment) {
        store.updateEquipmentType(equipment.id, { name, unit, defaultQuantity, dailyRate });
      } else {
        store.addEquipmentType({ name, unit, defaultQuantity, dailyRate });
      }
      close();
    });
  }

  private showDepartmentModal(department?: Department): void {
    const isEdit = !!department;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${isEdit ? '编辑' : '新增'}科室</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>科室名称 *</label>
            <input type="text" id="dept-name" value="${department?.name || ''}" placeholder="请输入科室名称">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" id="btn-cancel">取消</button>
          <button class="btn btn-primary" id="btn-confirm">${isEdit ? '保存' : '添加'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => document.body.removeChild(modal);

    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.querySelector('#btn-cancel')?.addEventListener('click', close);
    modal.querySelector('.modal-overlay')?.addEventListener('click', (e: Event) => {
      if (e.target === modal) close();
    });

    modal.querySelector('#btn-confirm')?.addEventListener('click', () => {
      const name = (modal.querySelector('#dept-name') as HTMLInputElement).value.trim();

      if (!name) {
        alert('请填写科室名称');
        return;
      }

      if (isEdit && department) {
        store.updateDepartment(department.id, { name });
      } else {
        store.addDepartment({ name });
      }
      close();
    });
  }
}
