import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AppConfigService } from './core/config/app-config.service';

describe('[F0] App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AppConfigService, useValue: { config: () => ({ ambiente: 'HML' }) } }],
    }).compileComponents();
  });

  it('mostra o nome da plataforma', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Esteira');
  });

  it('mostra o ambiente lido do /config.json', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('HML');
  });
});
