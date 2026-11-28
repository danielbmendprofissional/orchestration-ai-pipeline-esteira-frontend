import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnalisesApiService } from './analises-api.service';

const BASE = '/api/v1/entregas/e1/fluxos/f1';

describe('[E2] AnalisesApiService', () => {
  let api: AnalisesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AnalisesApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lê as Análises da Etapa e trata gate e campos nulos ausentes como null', async () => {
    const resultado = api.analisesDaEtapa('e1', 'f1', 'qa');
    const req = http.expectOne(`${BASE}/etapas/qa/analises`);
    expect(req.request.method).toBe('GET');
    req.flush({
      analises: [{ id: 'a1', escopo: 'artefato', fonte: 'sast', tipo: 'ferramenta', veredito: 'aprovado', recebidaEm: '2026-11-28T10:00:00Z', contagem: { critica: 0, alta: 0, media: 1, baixa: 0, info: 0 } }],
    });
    const r = await resultado;
    expect(r.gate).toBeNull();
    expect(r.analises[0].destino).toBeNull();
    expect(r.analises[0].custoUsd).toBeNull();
  });

  it('mantém o gate quando vem, com motivo ausente virando null', async () => {
    const resultado = api.analisesDaEtapa('e1', 'f1', 'hml');
    http.expectOne(`${BASE}/etapas/hml/analises`).flush({
      gate: { momento: 'gate', decisao: 'bloqueou', contagem: { critica: 1, alta: 0, media: 0, baixa: 0 }, decididaEm: '2026-11-28T10:00:00Z' },
      analises: [],
    });
    const r = await resultado;
    expect(r.gate?.decisao).toBe('bloqueou');
    expect(r.gate?.motivo).toBeNull();
  });

  it('lê os Achados paginados pelos headers X-* e envia X-Page, X-Page-Size e a severidade', async () => {
    const resultado = api.achados('e1', 'f1', 'a1', { pagina: 2, tamanho: 20 }, 'alta');
    const req = http.expectOne((r) => r.url === `${BASE}/analises/a1/achados`);
    expect(req.request.params.get('severidade')).toBe('alta');
    expect(req.request.headers.get('X-Page')).toBe('2');
    expect(req.request.headers.get('X-Page-Size')).toBe('20');
    req.flush([{ severidade: 'alta', titulo: '<script>x</script>', arquivo: 'a.cs', linha: 3 }], {
      headers: { 'X-Total-Count': '41', 'X-Total-Pages': '3', 'X-Page': '2', 'X-Page-Size': '20' },
    });
    const pagina = await resultado;
    expect(pagina.total).toBe(41);
    expect(pagina.totalPaginas).toBe(3);
    expect(pagina.itens[0].titulo).toBe('<script>x</script>');
    expect(pagina.itens[0].regraId).toBeNull();
    expect(pagina.itens[0].descricao).toBeNull();
  });

  it('sem severidade não manda o parâmetro', async () => {
    const resultado = api.achados('e1', 'f1', 'a1', { pagina: 1, tamanho: 20 });
    const req = http.expectOne((r) => r.url === `${BASE}/analises/a1/achados`);
    expect(req.request.params.has('severidade')).toBe(false);
    req.flush([], { headers: { 'X-Total-Count': '0', 'X-Total-Pages': '0', 'X-Page': '1', 'X-Page-Size': '20' } });
    await resultado;
  });
});
