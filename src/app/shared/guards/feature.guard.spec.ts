import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Route, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { featureGuard } from './feature.guard';
import type { RotaData } from './rota-data';

@Component({ template: 'tela da feature' })
class TelaComponent {}
@Component({ template: 'nada aqui' })
class NaoEncontradoComponent {}

describe('[A1] featureGuard', () => {
  let ligados: Set<string>;

  beforeEach(() => {
    ligados = new Set();
    TestBed.configureTestingModule({
      providers: [{ provide: FeatureFlagsService, useValue: { isEnabled: (codigo: string) => ligados.has(codigo) } }],
    });
  });

  const rodar = (data?: RotaData) => TestBed.runInInjectionContext(() => featureGuard({ data } as Route, [], {} as never));

  it('libera a rota sem exigência de flag', () => {
    expect(rodar({})).toBe(true);
  });

  it('libera quando o flag da rota está ligado', () => {
    ligados.add('A1');

    expect(rodar({ feature: 'A1' })).toBe(true);
  });

  it('barra quando o flag da rota está desligado ou ausente', () => {
    expect(rodar({ feature: 'A1' })).toBe(false);
  });

  it('com o flag desligado a URL cai no não encontrado; ligado, abre a rota', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'aplicacoes',
            data: { feature: 'A1' } satisfies RotaData,
            canMatch: [featureGuard],
            component: TelaComponent,
          },
          { path: '**', component: NaoEncontradoComponent },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/aplicacoes');
    expect(harness.routeNativeElement?.textContent).toContain('nada aqui');
    expect(TestBed.inject(Router).url).toBe('/aplicacoes');

    ligados.add('A1');
    await harness.navigateByUrl('/aplicacoes?x=1');
    expect(harness.routeNativeElement?.textContent).toContain('tela da feature');
  });
});
