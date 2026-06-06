import { store } from './store';
import { LoginView } from './components/LoginView';
import { Layout } from './components/Layout';
import { RecordsPage } from './components/RecordsPage';
import { AdminPage } from './components/AdminPage';
import { AuditPage } from './components/AuditPage';

type PageType = 'records' | 'admin' | 'audit';

class App {
  private container: HTMLElement;
  private layout: Layout | null = null;
  private currentPage: RecordsPage | AdminPage | AuditPage | null = null;
  private currentPageType: PageType = 'records';

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    store.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    const state = store.getState();

    if (!state.currentUser) {
      this.currentPage = null;
      this.layout = null;
      const loginView = new LoginView(this.container);
      loginView.render();
      return;
    }

    if (!this.layout) {
      this.layout = new Layout(this.container, (page) => this.handlePageChange(page));
    }

    this.layout.render();
    this.renderCurrentPage();
  }

  private handlePageChange(page: PageType): void {
    this.currentPageType = page;
    this.layout?.setCurrentPage(page);
    this.renderCurrentPage();
  }

  private renderCurrentPage(): void {
    const pageContainer = this.layout?.getPageContainer();
    if (!pageContainer) return;

    if (this.currentPage && 'destroy' in this.currentPage) {
      (this.currentPage as any).destroy?.();
    }

    this.currentPage = null;

    switch (this.currentPageType) {
      case 'records':
        this.currentPage = new RecordsPage(pageContainer);
        break;
      case 'admin':
        this.currentPage = new AdminPage(pageContainer);
        break;
      case 'audit':
        this.currentPage = new AuditPage(pageContainer);
        break;
    }

    this.currentPage?.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
