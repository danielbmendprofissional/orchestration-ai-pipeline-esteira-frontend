import { HttpErrorResponse } from '@angular/common/http';
import { AnalisesApiService as Real } from './analises-api.service';
import { AnalisesApiService, ENTREGA_BLOQUEADA_DO_PREVIEW, FLUXO_BLOQUEADO_DO_PREVIEW } from './analises-api.service.preview';
import { EntregasApiService, ENTREGAS_DO_PREVIEW } from './entregas-api.service.preview';

describe('[E2] AnalisesApiService (preview)', () => {
  const api = new AnalisesApiService();
  const e = ENTREGA_BLOQUEADA_DO_PREVIEW;
  const f = FLUXO_BLOQUEADO_DO_PREVIEW;

  it('tem a mesma superfície pública do serviço real', () => {
    const publicos = (c: object) => Object.getOwnPropertyNames(c).filter((n) => n !== 'constructor').sort();
    expect(publicos(AnalisesApiService.prototype)).toEqual(publicos(Real.prototype));
  });

  it('a Entrega de exemplo existe no preview com a Etapa hml bloqueada', async () => {
    expect(ENTREGAS_DO_PREVIEW).toContain(e);
    const entrega = await new EntregasApiService().obter(e);
    expect(entrega.fluxos[0].id).toBe(f);
    expect(entrega.fluxos[0].etapas.find((x) => x.etapa === 'hml')?.estado).toBe('bloqueada');
  });

  it('Etapa bloqueada: gate bloqueado, Do Artefato e Do Deploy por Destino, contagem coerente com os Achados', async () => {
    const r = await api.analisesDaEtapa(e, f, 'hml');
    expect(r.gate?.decisao).toBe('bloqueado');
    expect(r.analises.some((a) => a.escopo === 'artefato')).toBe(true);
    expect(new Set(r.analises.filter((a) => a.escopo === 'deploy').map((a) => a.destino)).size).toBeGreaterThan(1);
    expect(r.analises.some((a) => a.tipo === 'agente' && a.custoUsd !== null)).toBe(true);
    const opengrep = r.analises.find((a) => a.fonte === 'opengrep')!;
    const todos = await api.achados(e, f, opengrep.id, { pagina: 1, tamanho: 1000 });
    expect(todos.total).toBe(Number(opengrep.contagem.critica) + Number(opengrep.contagem.alta) + Number(opengrep.contagem.media) + Number(opengrep.contagem.baixa));
  });

  it('Achados paginados e filtrados por severidade', async () => {
    const opengrep = (await api.analisesDaEtapa(e, f, 'hml')).analises.find((a) => a.fonte === 'opengrep')!;
    const p2 = await api.achados(e, f, opengrep.id, { pagina: 2, tamanho: 20 });
    expect(p2.pagina).toBe(2);
    expect(p2.itens.length).toBeLessThanOrEqual(20);
    expect(p2.totalPaginas).toBeGreaterThan(1);
    const criticos = await api.achados(e, f, opengrep.id, { pagina: 1, tamanho: 20 }, 'critica');
    expect(criticos.itens.every((a) => a.severidade === 'critica')).toBe(true);
    expect(criticos.total).toBe(Number(opengrep.contagem.critica));
  });

  it('Etapa sem Análise devolve gate nulo e lista vazia; Análise desconhecida é 404', async () => {
    expect(await api.analisesDaEtapa(e, f, 'qa')).toEqual({ gate: null, analises: [] });
    const erro = await api.achados(e, f, 'nao-existe', { pagina: 1, tamanho: 20 }).catch((x: unknown) => x);
    expect(erro).toBeInstanceOf(HttpErrorResponse);
    expect((erro as HttpErrorResponse).status).toBe(404);
  });
});
