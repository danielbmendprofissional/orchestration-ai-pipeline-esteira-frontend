import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth/auth.service';
import { carregarFeatures, iniciarApp } from './boot';
import { AppConfigService } from './config/app-config.service';
import { FeatureFlagsService } from './config/feature-flags.service';

describe('[F0.5] iniciarApp (boot)', () => {
  let ordem: string[];

  function montar(configCarregar: () => Promise<void>) {
    ordem = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: AppConfigService, useValue: { carregar: configCarregar } },
        {
          provide: AuthService,
          useValue: { carregar: async () => void ordem.push('me') },
        },
      ],
    });
  }

  it('carrega o /config.json e só depois o me da sessão', async () => {
    montar(async () => void ordem.push('config'));

    await TestBed.runInInjectionContext(() => iniciarApp());

    expect(ordem).toEqual(['config', 'me']);
  });

  it('pega os dois serviços antes do primeiro await (inject só funciona em contexto de injeção)', async () => {
    // Regressão: `inject(AuthService)` depois de `await config.carregar()` dava NG0203 no boot real.
    montar(() => new Promise<void>((resolve) => setTimeout(() => (ordem.push('config'), resolve()))));

    await expect(TestBed.runInInjectionContext(() => iniciarApp())).resolves.toBeUndefined();
    expect(ordem).toEqual(['config', 'me']);
  });

  it('não chama o me quando o /config.json falha (o app não sobe)', async () => {
    montar(() => Promise.reject(new Error('sem /config.json')));

    await expect(TestBed.runInInjectionContext(() => iniciarApp())).rejects.toThrow('sem /config.json');
    expect(ordem).toEqual([]);
  });
});

describe('[A1] carregarFeatures (boot)', () => {
  it('carrega o /features.json pelo FeatureFlagsService', async () => {
    const carregar = vi.fn(async () => undefined);
    TestBed.configureTestingModule({ providers: [{ provide: FeatureFlagsService, useValue: { carregar } }] });

    await TestBed.runInInjectionContext(() => carregarFeatures());

    expect(carregar).toHaveBeenCalledOnce();
  });
});
