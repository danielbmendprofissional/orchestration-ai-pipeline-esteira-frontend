import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { TempoRealService } from '../../core/tempo-real/tempo-real.service';
import type { EstadoTempoReal } from '../../core/tempo-real/tempo-real.tipos';
import { FatiasApiService } from './fatias-api.service';
import { FatiasService } from './fatias.service';

describe('[T1] FatiasService: estado do tempo real para o indicador', () => {
  const ativo = signal(false);
  const estado = signal<EstadoTempoReal>('reconectando');

  beforeEach(() => {
    ativo.set(false);
    estado.set('reconectando');
    TestBed.configureTestingModule({
      providers: [
        { provide: FatiasApiService, useValue: {} },
        { provide: TempoRealService, useValue: { eventos: new Subject(), ativo, estado, iniciar: vi.fn(), parar: vi.fn() } },
      ],
    });
  });

  it('inativo (flag desligado ou parado): sem estado, o indicador não aparece', () => {
    expect(TestBed.inject(FatiasService).estadoTempoReal()).toBeNull();
  });

  it('ativo: repassa o estado do serviço de tempo real', () => {
    const servico = TestBed.inject(FatiasService);
    ativo.set(true);
    estado.set('ao-vivo');
    expect(servico.estadoTempoReal()).toBe('ao-vivo');
    estado.set('consulta');
    expect(servico.estadoTempoReal()).toBe('consulta');
  });
});
