import { store } from '../store';
import { getMockUsers } from '../utils/storage';
import { getRoleLabel } from '../utils/format';

export class LoginView {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    const users = getMockUsers();
    this.container.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <h1 class="login-title">诊疗器材管理系统</h1>
          <p class="login-subtitle">请选择用户登录</p>
          <div class="user-list">
            ${users
              .map(
                user => `
              <button class="user-item" data-user-id="${user.id}">
                <div class="user-name">${user.name}</div>
                <div class="user-role">${getRoleLabel(user.role)}</div>
              </button>
            `
              )
              .join('')}
          </div>
          <div class="login-tip">
            <p>提示：本应用数据存储在浏览器本地 localStorage 中</p>
          </div>
        </div>
      </div>
    `;

    this.container.querySelectorAll('.user-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        const user = users.find(u => u.id === userId);
        if (user) {
          store.login(user);
        }
      });
    });
  }
}
