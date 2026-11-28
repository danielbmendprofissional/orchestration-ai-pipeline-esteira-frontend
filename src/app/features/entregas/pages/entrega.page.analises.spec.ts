import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { AnalisesService } from '../analises.service';
import { EntregasService } from '../entregas.service';
import type { Entrega, EntregaEtapa } from '../entregas.tipos';
import { EntregaPage } from './entrega.page';

const etapa = (nome: string, estado: string): EntregaEtapa => ({ etapa: nome, estado, codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: '2026-11-28T10:00:00Z' });
const entrega = (hml = 'bloqueada'): Entrega => ({
  id: 'e1', aplicacao: { id: 'a1', nome: 'Valuto' }, abertaPor: { nome: 'Ana' }, abertaEm: '2026-11-28T10:00:00Z', estado: 'bloqueada-ou-falha', vezDe: null,
  fluxos: [{ id: 'f1', projeto: { id: 'p1', nome: 'valuto-api' }, tipoMudanca: 'feature', sha: 'abc1234', fatias: [], etapas: [etapa('abertura', 'concluido'), etapa('qa', 'concluido'), etapa('hml', hml), etapa('prd', 'nao-iniciado')] }],
});

describe('[E2] EntregaPage (Análises)', () => {
  const dados = signal<Entrega>(entrega());
  const aberta = signal<EntregaEtapa | null>(null);
  const habilitado = signal(true);
  const entregas = {
    entrega: dados, carregando: signal(false), erro: signal(null), etapaAberta: aberta, estadoTempoReal: signal('ao-vivo'),
    acompanhar: vi.fn(async () => undefined), parar: vi.fn(), tentarDeNovo: vi.fn(),
    abrirEtapa: vi.fn((_f: string, nome: string) => aberta.set(dados().fluxos[0].etapas.find((e) => e.etapa === nome) ?? null)),
    fecharEtapa: vi.fn(() => aberta.set(null)),
  };
  const analises = {
    habilitado, gate: signal(null), doArtefato: signal([]), doDeploy: signal([]), carregando: signal(false), erro: signal(false), vazio: signal(false),
    analiseAberta: signal(null), severidade: signal(undefined), achados: signal(null), achadosCarregando: signal(false), achadosErro: signal(false),
    abrir: vi.fn(async () => undefined), fechar: vi.fn(), tentarDeNovo: vi.fn(), abrirAchados: vi.fn(), fecharAchados: vi.fn(),
    filtrarPorSeveridade: vi.fn(), irParaPagina: vi.fn(), tentarAchadosDeNovo: vi.fn(),
  };

  const montar = () => {
    const fixture = TestBed.createComponent(EntregaPage);
    fixture.detectChanges();
    return fixture;
  };
  const el = (fx: ReturnType<typeof montar>) => fx.nativeElement as HTMLElement;

  beforeEach(() => {
    dados.set(entrega()); aberta.set(null); habilitado.set(true);
    for (const f of [...Object.values(entregas), ...Object.values(analises)]) if (typeof f === 'function' && 'mockClear' in f) f.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EntregasService, useValue: entregas },
        { provide: AnalisesService, useValue: analises },
        { provide: FeatureFlagsService, useValue: { isEnabled: () => false } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'e1' })) } },
      ],
    });
  });

  it('abrir a Etapa chama analises.abrir(entrega, fluxo, etapa) uma vez; fechar chama analises.fechar', () => {
    const fx = montar();
    entregas.abrirEtapa('f1', 'hml');
    fx.detectChanges();
    expect(analises.abrir).toHaveBeenCalledTimes(1);
    expect(analises.abrir).toHaveBeenCalledWith('e1', 'f1', 'hml');
    entregas.fecharEtapa();
    fx.detectChanges();
    expect(analises.fechar).toHaveBeenCalled();
  });

  it('a Entrega recarregada (mesma Etapa) não reabre as Análises', () => {
    const fx = montar();
    entregas.abrirEtapa('f1', 'hml');
    fx.detectChanges();
    dados.set(entrega('bloqueada'));
    aberta.set(dados().fluxos[0].etapas[2]);
    fx.detectChanges();
    expect(analises.abrir).toHaveBeenCalledTimes(1);
  });

  it('com a flag ligada, o painel da Etapa tem as abas; na Abertura não tem', () => {
    const fx = montar();
    entregas.abrirEtapa('f1', 'hml');
    fx.detectChanges();
    expect(el(fx).querySelectorAll('[role="tab"]')).toHaveLength(2);
    entregas.abrirEtapa('f1', 'abertura');
    fx.detectChanges();
    expect(el(fx).querySelectorAll('[role="tab"]')).toHaveLength(0);
  });

  it('com a flag desligada, sem abas e sem chamar a API de Análises', () => {
    habilitado.set(false);
    const fx = montar();
    entregas.abrirEtapa('f1', 'hml');
    fx.detectChanges();
    expect(el(fx).querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(el(fx).querySelector('[data-testid="etapa-painel"]')).not.toBeNull();
  });

  it('ao destruir a tela, fecha as Análises', () => {
    montar().destroy();
    expect(analises.fechar).toHaveBeenCalled();
  });
});
