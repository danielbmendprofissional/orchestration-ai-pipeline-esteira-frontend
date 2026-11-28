import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { FeatureFlagsService } from '../../core/config/feature-flags.service';
import { TempoRealService } from '../../core/tempo-real/tempo-real.service';
import type { EventoTempoReal } from '../../core/tempo-real/tempo-real.tipos';
import { AnalisesApiService } from './analises-api.service';
import { AnalisesService } from './analises.service';
import { DEBOUNCE_ENTREGA_MS } from './entregas.service';
import { rotuloDaEtapa } from './entregas.apresentacao';
import type { AnaliseDaEtapa, AnalisesDaEtapa } from './analises.tipos';

const contagem = { critica: 0, alta: 0, media: 0, baixa: 0, info: 0 };
const analise = (id: string, escopo: string, destino: string | null = null): AnaliseDaEtapa => ({
  id, escopo, fonte: 'sast', tipo: 'ferramenta', veredito: 'reprovado', destino, custoUsd: null, recebidaEm: '2026-11-28T10:00:00Z', contagem,
});
const resposta = (...analises: AnaliseDaEtapa[]): AnalisesDaEtapa => ({ gate: null, analises });
const pagina = (n: number) => ({ itens: [{ severidade: 'alta', titulo: 't', regraId: null, arquivo: null, linha: null, descricao: null }], total: 45, totalPaginas: 3, pagina: n, tamanho: 20 });
const atualizada = (entregaId: string) => ({ tipo: 'entrega.atualizada', aplicacaoId: 'ap', entregaId }) as unknown as EventoTempoReal;

describe('[E2] AnalisesService', () => {
  let api: { analisesDaEtapa: ReturnType<typeof vi.fn>; achados: ReturnType<typeof vi.fn> };
  let eventos: Subject<EventoTempoReal>;
  let flagE2: boolean;
  let servico: AnalisesService;

  beforeEach(() => {
    vi.useFakeTimers();
    flagE2 = true;
    eventos = new Subject<EventoTempoReal>();
    api = {
      analisesDaEtapa: vi.fn(async () => resposta(analise('a1', 'artefato'), analise('a2', 'deploy', 'k8s-a'), analise('a3', 'deploy', 'k8s-b'), analise('a4', 'deploy', 'k8s-a'))),
      achados: vi.fn(async (_e, _f, _a, p: { pagina: number }) => pagina(p.pagina)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalisesApiService, useValue: api },
        { provide: TempoRealService, useValue: { eventos } },
        { provide: FeatureFlagsService, useValue: { isEnabled: (c: string) => c === 'E2' && flagE2 } },
      ],
    });
    servico = TestBed.inject(AnalisesService);
  });
  afterEach(() => {
    servico.fechar();
    vi.useRealTimers();
  });

  it('flag Features:E2 ausente: habilitado é false e abrir não chama a API', async () => {
    flagE2 = false;
    expect(servico.habilitado()).toBe(false);
    await servico.abrir('e1', 'f1', 'qa');
    expect(api.analisesDaEtapa).not.toHaveBeenCalled();
    expect(servico.analises()).toEqual([]);
  });

  it('abrir carrega e separa Do Artefato e Do Deploy agrupado por Destino', async () => {
    const p = servico.abrir('e1', 'f1', 'qa');
    expect(servico.carregando()).toBe(true);
    await p;
    expect(api.analisesDaEtapa).toHaveBeenCalledWith('e1', 'f1', 'qa');
    expect(servico.carregando()).toBe(false);
    expect(servico.doArtefato().map((a) => a.id)).toEqual(['a1']);
    expect(servico.doDeploy().map((g) => [g.destino, g.analises.map((a) => a.id)])).toEqual([['k8s-a', ['a2', 'a4']], ['k8s-b', ['a3']]]);
    expect(servico.vazio()).toBe(false);
  });

  it('sem Análise: vazio é true', async () => {
    api.analisesDaEtapa.mockResolvedValueOnce(resposta());
    await servico.abrir('e1', 'f1', 'qa');
    expect(servico.vazio()).toBe(true);
    expect(servico.erro()).toBe(false);
  });

  it('falha de rede: erro true e tentarDeNovo recarrega', async () => {
    api.analisesDaEtapa.mockRejectedValueOnce(new Error('rede'));
    await servico.abrir('e1', 'f1', 'qa');
    expect(servico.erro()).toBe(true);
    expect(servico.vazio()).toBe(false);
    await servico.tentarDeNovo();
    expect(servico.erro()).toBe(false);
    expect(servico.analises()).toHaveLength(4);
  });

  it('entrega.atualizada do id em tela recarrega as Análises sem a pessoa apertar nada, uma recarga por rajada', async () => {
    await servico.abrir('e1', 'f1', 'qa');
    api.analisesDaEtapa.mockClear();
    api.analisesDaEtapa.mockResolvedValueOnce(resposta(analise('novo', 'artefato')));
    eventos.next(atualizada('e1'));
    eventos.next(atualizada('e1'));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_ENTREGA_MS);
    expect(api.analisesDaEtapa).toHaveBeenCalledTimes(1);
    expect(servico.analises().map((a) => a.id)).toEqual(['novo']);
  });

  it('evento de outra Entrega é ignorado e, fechado o painel, nada recarrega', async () => {
    await servico.abrir('e1', 'f1', 'qa');
    api.analisesDaEtapa.mockClear();
    eventos.next(atualizada('outra'));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_ENTREGA_MS);
    expect(api.analisesDaEtapa).not.toHaveBeenCalled();
    servico.fechar();
    eventos.next(atualizada('e1'));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_ENTREGA_MS);
    expect(api.analisesDaEtapa).not.toHaveBeenCalled();
  });

  it('recarga silenciosa que falha mantém o que está em tela, sem erro', async () => {
    await servico.abrir('e1', 'f1', 'qa');
    api.analisesDaEtapa.mockRejectedValueOnce(new Error('rede'));
    eventos.next({ tipo: 'recarga' } as EventoTempoReal);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_ENTREGA_MS);
    expect(servico.erro()).toBe(false);
    expect(servico.analises()).toHaveLength(4);
  });

  it('abrirAchados carrega a primeira página; filtro volta à página 1; irParaPagina muda de página', async () => {
    await servico.abrir('e1', 'f1', 'qa');
    await servico.abrirAchados('a1');
    expect(api.achados).toHaveBeenLastCalledWith('e1', 'f1', 'a1', { pagina: 1, tamanho: 20 }, undefined);
    expect(servico.achados()?.total).toBe(45);
    await servico.irParaPagina(3);
    expect(api.achados).toHaveBeenLastCalledWith('e1', 'f1', 'a1', { pagina: 3, tamanho: 20 }, undefined);
    await servico.filtrarPorSeveridade('critica');
    expect(api.achados).toHaveBeenLastCalledWith('e1', 'f1', 'a1', { pagina: 1, tamanho: 20 }, 'critica');
    expect(servico.severidade()).toBe('critica');
    servico.fecharAchados();
    expect(servico.analiseAberta()).toBeNull();
    expect(servico.achados()).toBeNull();
  });

  it('falha nos Achados: achadosErro true e tentarAchadosDeNovo recarrega', async () => {
    await servico.abrir('e1', 'f1', 'qa');
    api.achados.mockRejectedValueOnce(new Error('rede'));
    await servico.abrirAchados('a1');
    expect(servico.achadosErro()).toBe(true);
    await servico.tentarAchadosDeNovo();
    expect(servico.achadosErro()).toBe(false);
    expect(servico.achados()?.itens).toHaveLength(1);
  });

  it('Etapa bloqueada tem rótulo próprio com texto e ícone de cadeado', () => {
    expect(rotuloDaEtapa('bloqueada')).toEqual({ texto: 'Bloqueada', icone: 'lucideLock', tom: 'vermelho' });
  });
});
