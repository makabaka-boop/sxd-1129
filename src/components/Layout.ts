import { store } from '../store';
import { getRoleLabel } from '../utils/format';
import type { UserRole } from '../types';

type PageType = 'records' | 'admin' | 'audit';

export class Layout {
  private container: HTMLElement;
  private currentPage: PageType = 'records';
  private pageContainer: HTMLElement;
  private onPageChange: (page: PageType) => void;

  constructor(container: HTMLElement, onPageChange: (page: PageType) => void) {
    this.container = container;
    this.onPageChange = onPageChange;
    this.pageContainer = document.createElement('div');
    this.pageContainer.className = 'page-content';
  }

  public getPageContainer(): HTMLElement {
    return this.pageContainer;
  }

  public setCurrentPage(page: PageType): void {
    this.currentPage = page;
    this.updateNav();
  }

  public render(): void {
    const state = store.getState();
    const user = state.currentUser;
    if (!user) return;

    const canManageSettings = store.canManageSettings();
    const canViewAudit = store.canViewAudit();

    this.container.innerHTML = `
      <div class="app-layout">
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title">诊疗器材管理系统</h1>
          </div>
          <nav class="app-nav">
            <button class="nav-item ${this.currentPage === 'records' ? 'active' : ''}" data-page="records">
              器材领用记录
            </button>
            ${canManageSettings ? `<button class="nav-item ${this.currentPage === 'admin' ? 'active' : ''}" data-page="admin">系统管理</button>` : ''}
            ${canViewAudit ? `<button class="nav-item ${this.currentPage === 'audit' ? 'active' : ''}" data-page="audit">审计视图</button>` : ''}
          </nav>
          <div class="header-right">
            <div class="user-info">
              <span class="user-name">${user.name}</span>
              <span class="user-role">(${getRoleLabel(user.role)})</span>
            </div>
            <button class="btn-logout" id="btn-logout">退出登录</button>
          </div>
        </header>
        <main class="app-main">
          <div id="page-container"></div>
        </main>
      </div>
    `;

    this.pageContainer = this.container.querySelector('#page-container') as HTMLElement;

    this.container.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page') as PageType;
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.updateNav();
          this.onPageChange(page);
        }
      });
    });

    const logoutBtn = this.container.querySelector('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        store.logout();
      });
    }
  }

  private updateNav(): void {
    this.container.querySelectorAll('.nav-item').forEach(btn => {
      const page = btn.getAttribute('data-page');
      if (page === this.currentPage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}
