import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import type { EstadoTempoReal } from '../../../core/tempo-real/tempo-real.tipos';
import { EntregasService } from '../entregas.service';
import type { Entrega, EntregaEtapa, ErroDaEntrega } from '../entregas.tipos';
import { EntregaPage } from './entrega.page';

const etapa = (nome: string, estado: string, extra: Partial<EntregaEtapa> = {}): EntregaEtapa => ({
  etapa: nome, estado, codigoFalha: null, pulada: null, pipelineUrl: null, atualizadaEm: '2026-11-27T10:00:00Z', ...extra,
});
const fluxo = (id: string, projeto: string, qa = 'executando') => ({
  id, projeto: { id: 'p-' + id, nome: projeto }, tipoMudanca: 'feature', sha: 'abc1234', fatias: [{ codigo: 'E1b', comFlag: true }],
  etapas: [etapa('abertura', 'concluido'), etapa('qa', qa), etapa('hml', 'nao-iniciado'), etapa('prd', 'nao-iniciado')],
});
const entrega = (over: Partial<Entrega> = {}): Entrega => ({
  id: 'e1', aplicacao: { id: 'a1', nome: 'Valuto' }, abertaPor: { nome: 'Ana' }, abertaEm: '2026-11-27T10:00:00Z',
  estado: 'em-andamento', vezDe: null, fluxos: [fluxo('f1', 'valuto-api'), fluxo('f2', 'valuto-frontend')], ...over,
});

describe('[E1b] EntregaPage', () => {
  const dados = signal<Entrega | null>(entrega());
  const carregando = signal(false);
  const erro = signal<ErroDaEntrega | null>(null);
  const aberta = signal<EntregaEtapa | null>(null);
  const tempoReal = signal<EstadoTempoReal | null>('ao-vivo');
  const servico = {
    entrega: dados, carregando, erro, etapaAberta: aberta, estadoTempoReal: tempoReal,
    acompanhar: vi.fn(async () => undefined), parar: vi.fn(), tentarDeNovo: vi.fn(async () => undefined),
    abrirEtapa: vi.fn((fluxoId: string, nome: string) => aberta.set(dados()?.fluxos.find((f) => f.id === fluxoId)?.etapas.find((e) => e.etapa === nome) ?? null)),
    fecharEtapa: vi.fn(() => aberta.set(null)),
  };
  const flags = new Set<string>();

  const montar = () => {
    const fixture = TestBed.createComponent(EntregaPage);
    fixture.detectChanges();
    return fixture;
  };
  const el = (fx: ReturnType<typeof montar>) => fx.nativeElement as HTMLElement;
  const q = (fx: ReturnType<typeof montar>, id: string) => el(fx).querySelector<HTMLElement>(`[data-testid="${id}"]`);

  beforeEach(() => {
    dados.set(entrega()); carregando.set(false); erro.set(null); aberta.set(null); tempoReal.set('ao-vivo'); flags.clear();
    Object.values(servico).forEach((f) => typeof f === 'function' && 'mockClear' in f && f.mockClear());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EntregasService, useValue: servico },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => flags.has(c) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'e1' })) } },
      ],
    });
  });

  it('acompanha o id da rota e para ao destruir', () => {
    const fx = montar();
    expect(servico.acompanhar).toHaveBeenCalledWith('e1');
    fx.destroy();
    expect(servico.parar).toHaveBeenCalled();
  });

  it('cabeçalho: Aplicação, aberta por, estado da Entrega (ícone + texto) e uma faixa por Fluxo', () => {
    const fx = montar();
    expect(q(fx, 'cabecalho')!.textContent).toContain('Valuto');
    expect(q(fx, 'cabecalho')!.textContent).toContain('Ana');
    const estado = q(fx, 'estado-da-entrega')!;
    expect(estado.textContent).toContain('Em andamento');
    expect(estado.querySelector('ng-icon')).not.toBeNull();
    expect(el(fx).querySelectorAll('est-fluxo-faixa')).toHaveLength(2);
    expect(el(fx).querySelectorAll('[data-testid="etapa"]')).toHaveLength(8);
  });

  it('vezDe aparece em texto quando houver', () => {
    dados.set(entrega({ vezDe: 'E-10' }));
    expect(q(montar(), 'vez-de')!.textContent).toContain('E-10');
    dados.set(entrega());
    expect(q(montar(), 'vez-de')).toBeNull();
  });

  it('clicar numa Etapa abre o painel dela no Fluxo certo; fechar esconde', () => {
    const fx = montar();
    el(fx).querySelectorAll<HTMLButtonElement>('[data-etapa="qa"]')[1].click();
    fx.detectChanges();
    expect(servico.abrirEtapa).toHaveBeenCalledWith('f2', 'qa');
    expect(el(fx).querySelectorAll('est-etapa-painel')).toHaveLength(1);
    expect(el(fx).querySelector('[data-testid="fluxo-f2"] est-etapa-painel')).not.toBeNull();
    el(fx).querySelector<HTMLButtonElement>('[aria-label="Fechar painel da Etapa"]')!.click();
    fx.detectChanges();
    expect(el(fx).querySelector('est-etapa-painel')).toBeNull();
  });

  it('"ver na auditoria" só com Features:X1 ligado', () => {
    expect(q(montar(), 'ver-na-auditoria')).toBeNull();
    TestBed.resetTestingModule();
    flags.add('X1');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EntregasService, useValue: servico },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => flags.has(c) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'e1' })) } },
      ],
    });
    const fx = montar();
    expect(q(fx, 'ver-na-auditoria')!.textContent).toContain('ver na auditoria');
    // [X1] o link filtra pelo objeto (PublicId da Entrega), não por um parâmetro próprio
    expect(q(fx, 'ver-na-auditoria')!.getAttribute('href')).toBe('/auditoria?objeto=e1');
  });

  it('sem botão de ação na página inteira', () => {
    const fx = montar();
    el(fx).querySelectorAll('[data-etapa="qa"]')[0].dispatchEvent(new Event('click'));
    const textos = Array.from(el(fx).querySelectorAll('button')).map((b) => (b.textContent ?? '').toLowerCase());
    expect(textos.some((t) => /aprovar|reprovar|atalho|pular/.test(t))).toBe(false);
  });

  it('indicador do tempo real conforme o estado, com aria-live polite; sem estado, nada', () => {
    const fx = montar();
    expect(q(fx, 'tempo-real')!.textContent).toContain('Ao vivo');
    expect(q(fx, 'tempo-real')!.getAttribute('aria-live')).toBe('polite');
    tempoReal.set('consulta'); fx.detectChanges();
    expect(q(fx, 'tempo-real')!.textContent).toContain('Atualização a cada 30 s');
    tempoReal.set('reconectando'); fx.detectChanges();
    expect(q(fx, 'tempo-real')!.textContent).toContain('Reconectando…');
    tempoReal.set(null); fx.detectChanges();
    expect(q(fx, 'tempo-real')).toBeNull();
  });

  it('carregando: mostra o estado de carga (sem Entrega)', () => {
    dados.set(null); carregando.set(true);
    const fx = montar();
    expect(q(fx, 'carregando')!.getAttribute('role')).toBe('status');
    expect(q(fx, 'cabecalho')).toBeNull();
  });

  it('404: "Entrega não encontrada ou sem acesso"', () => {
    dados.set(null); erro.set('nao-encontrada');
    const fx = montar();
    expect(q(fx, 'nao-encontrada')!.textContent).toContain('Entrega não encontrada ou sem acesso');
    expect(q(fx, 'tentar-de-novo')).toBeNull();
  });

  it('erro: mensagem e "Tentar de novo" chama o serviço', () => {
    dados.set(null); erro.set('falha');
    const fx = montar();
    expect(q(fx, 'erro')!.getAttribute('role')).toBe('alert');
    q(fx, 'tentar-de-novo')!.click();
    expect(servico.tentarDeNovo).toHaveBeenCalled();
  });
});
