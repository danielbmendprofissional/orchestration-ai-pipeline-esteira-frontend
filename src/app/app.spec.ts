import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

// A casca provisória da F0 (h1 "Esteira" + selo do ambiente) foi substituída pelo shell da F0.5:
// o que ela mostrava agora é testado em layout/shell.component.spec.ts.
describe('[F0.5] App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] }).compileComponents();
  });

  it('só hospeda as rotas e o toaster dos avisos', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('router-outlet')).not.toBeNull();
    expect(raiz.querySelector('hlm-toaster')).not.toBeNull();
  });
});
