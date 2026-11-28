import { TestBed } from '@angular/core/testing';
import type { Achado, AnaliseDaEtapa, EstadoDasAnalises } from '../analises.tipos';
import { AnalisesAbaComponent } from './analises-aba.component';

const contagem = { critica: 1, alta: 2, media: 0, baixa: 3, info: 0 };
const analise = (id: string, fonte: string, over: Partial<AnaliseDaEtapa> = {}): AnaliseDaEtapa => ({
  id, escopo: 'artefato', fonte, tipo: 'ferramenta', veredito: 'reprovado', destino: null, custoUsd: null, recebidaEm: '2026-11-28T10:00:00Z', contagem, ...over,
});
const achado = (over: Partial<Achado> = {}): Achado => ({ severidade: 'critica', titulo: 'SQL injection', regraId: 'CWE-89', arquivo: 'src/a.cs', linha: 42, descricao: 'concatenação de entrada', ...over });
const pagina = (itens: Achado[], over: Record<string, number> = {}) => ({ itens, total: itens.length, totalPaginas: 1, pagina: 1, tamanho: 20, ...over });
const base: EstadoDasAnalises = {
  gate: null, doArtefato: [], doDeploy: [], carregando: false, erro: false, vazio: false,
  analiseAberta: null, severidade: undefined, achados: null, achadosCarregando: false, achadosErro: false,
};

describe('[E2] AnalisesAbaComponent', () => {
  const montar = (estado: Partial<EstadoDasAnalises> = {}) => {
    const fixture = TestBed.createComponent(AnalisesAbaComponent);
    fixture.componentRef.setInput('estado', { ...base, ...estado });
    fixture.detectChanges();
    return fixture;
  };
  const el = (fx: ReturnType<typeof montar>) => fx.nativeElement as HTMLElement;
  const q = (fx: ReturnType<typeof montar>, id: string) => el(fx).querySelector<HTMLElement>(`[data-testid="${id}"]`);

  it('duas colunas: Do Artefato e Do Deploy por Destino, com veredito e contagem', () => {
    const fx = montar({
      doArtefato: [analise('a1', 'opengrep')],
      doDeploy: [
        { destino: 'k8s-a', analises: [analise('a2', 'zap', { escopo: 'deploy', destino: 'k8s-a', veredito: 'aprovado' })] },
        { destino: 'k8s-b', analises: [analise('a3', 'smoke', { escopo: 'deploy', destino: 'k8s-b' })] },
      ],
    });
    expect(q(fx, 'coluna-artefato')!.textContent).toContain('Do Artefato');
    expect(q(fx, 'coluna-artefato')!.textContent).toContain('opengrep');
    const deploy = q(fx, 'coluna-deploy')!;
    expect(deploy.textContent).toContain('Do Deploy');
    expect(deploy.textContent).toContain('k8s-a');
    expect(deploy.textContent).toContain('k8s-b');
    expect(deploy.textContent).toContain('Aprovado');
    expect(q(fx, 'coluna-artefato')!.textContent).toContain('Reprovado');
    expect(q(fx, 'coluna-artefato')!.textContent).toMatch(/1 crítica/);
  });

  it('Análise de agente mostra o custo discreto; de ferramenta não', () => {
    const fx = montar({ doArtefato: [analise('a1', 'agent-security', { tipo: 'agente', custoUsd: 0.31 }), analise('a2', 'trivy-fs')] });
    const linhas = el(fx).querySelectorAll('[data-testid="analise"]');
    expect(linhas[0].textContent).toContain('US$ 0,31');
    expect(linhas[1].textContent).not.toContain('US$');
  });

  it('clicar numa Análise pede os Achados dela', () => {
    const fx = montar({ doArtefato: [analise('a1', 'opengrep')] });
    const pedidos: string[] = [];
    fx.componentInstance.abrirAchados.subscribe((id) => pedidos.push(id));
    el(fx).querySelector<HTMLButtonElement>('[data-testid="analise"] button')!.click();
    expect(pedidos).toEqual(['a1']);
  });

  it('estado vazio: "nenhuma Análise recebida ainda"', () => {
    expect(q(montar({ vazio: true }), 'vazio')!.textContent).toContain('Nenhuma Análise recebida ainda');
  });

  it('carregando mostra status; erro mostra alerta com "Tentar de novo" que emite', () => {
    expect(q(montar({ carregando: true }), 'carregando')!.getAttribute('role')).toBe('status');
    const fx = montar({ erro: true });
    let n = 0;
    fx.componentInstance.tentarDeNovo.subscribe(() => n++);
    expect(q(fx, 'erro')!.getAttribute('role')).toBe('alert');
    q(fx, 'tentar-de-novo')!.click();
    expect(n).toBe(1);
  });

  it('lista os Achados com severidade, título, regra, arquivo:linha e descrição', () => {
    const fx = montar({ doArtefato: [analise('a1', 'opengrep')], analiseAberta: 'a1', achados: pagina([achado()]) });
    const t = q(fx, 'achado')!.textContent!;
    expect(t).toContain('Crítica');
    expect(t).toContain('SQL injection');
    expect(t).toContain('CWE-89');
    expect(t).toContain('src/a.cs:42');
    expect(t).toContain('concatenação de entrada');
  });

  it('texto de terceiro é só texto: <script> e <img> não viram elementos', () => {
    const fx = montar({
      analiseAberta: 'a1',
      achados: pagina([achado({ titulo: '<script>alert(1)</script>', descricao: '<img src=x onerror=alert(1)>', arquivo: '<b>x</b>', regraId: '<i>r</i>' })]),
    });
    const item = q(fx, 'achado')!;
    expect(item.textContent).toContain('<script>alert(1)</script>');
    expect(item.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(item.querySelector('script, img, b, i')).toBeNull();
  });

  it('Achado sem arquivo, linha, regra e descrição não mostra lixo', () => {
    const fx = montar({ analiseAberta: 'a1', achados: pagina([achado({ arquivo: null, linha: null, regraId: null, descricao: null })]) });
    const t = q(fx, 'achado')!.textContent!;
    expect(t).not.toContain('null');
    expect(t).not.toContain(':42');
  });

  it('filtro de severidade emite a escolha; "Todas" emite undefined', () => {
    const fx = montar({ analiseAberta: 'a1', achados: pagina([achado()]) });
    const filtros: unknown[] = [];
    fx.componentInstance.filtrar.subscribe((s) => filtros.push(s));
    const botoes = Array.from(el(fx).querySelectorAll<HTMLButtonElement>('[data-testid="filtro-severidade"] button'));
    expect(botoes.map((b) => b.textContent!.trim())).toEqual(['Todas', 'Crítica', 'Alta', 'Média', 'Baixa']);
    botoes[2].click();
    botoes[0].click();
    expect(filtros).toEqual(['alta', undefined]);
  });

  it('o filtro ativo fica marcado com aria-pressed', () => {
    const fx = montar({ analiseAberta: 'a1', severidade: 'alta', achados: pagina([achado()]) });
    const botoes = Array.from(el(fx).querySelectorAll<HTMLButtonElement>('[data-testid="filtro-severidade"] button'));
    expect(botoes.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false']);
  });

  it('paginação: "Página 2 de 3", os botões emitem a página vizinha e a última desabilita "Próxima"', () => {
    const fx = montar({ analiseAberta: 'a1', achados: pagina([achado()], { total: 45, totalPaginas: 3, pagina: 2 }) });
    const paginas: number[] = [];
    fx.componentInstance.irParaPagina.subscribe((p) => paginas.push(p));
    expect(q(fx, 'pagina')!.textContent).toContain('Página 2 de 3');
    q(fx, 'pagina-anterior')!.click();
    q(fx, 'pagina-proxima')!.click();
    expect(paginas).toEqual([1, 3]);
    const ultima = montar({ analiseAberta: 'a1', achados: pagina([achado()], { total: 45, totalPaginas: 3, pagina: 3 }) });
    expect((q(ultima, 'pagina-proxima') as HTMLButtonElement).disabled).toBe(true);
  });

  it('Achados vazio, carregando e erro; "Voltar às Análises" emite fecharAchados', () => {
    expect(q(montar({ analiseAberta: 'a1', achados: pagina([], { totalPaginas: 0 }) }), 'achados-vazio')!.textContent).toContain('Nenhum Achado');
    expect(q(montar({ analiseAberta: 'a1', achadosCarregando: true }), 'achados-carregando')!.getAttribute('role')).toBe('status');
    const fx = montar({ analiseAberta: 'a1', achadosErro: true });
    let tentou = 0;
    let fechou = 0;
    fx.componentInstance.tentarAchadosDeNovo.subscribe(() => tentou++);
    fx.componentInstance.fecharAchados.subscribe(() => fechou++);
    expect(q(fx, 'achados-erro')!.getAttribute('role')).toBe('alert');
    q(fx, 'achados-tentar-de-novo')!.click();
    q(fx, 'voltar-analises')!.click();
    expect([tentou, fechou]).toEqual([1, 1]);
  });

  it('não tem botão de Exceção, aprovar nem Atalho', () => {
    const fx = montar({ doArtefato: [analise('a1', 'opengrep')], analiseAberta: 'a1', achados: pagina([achado()]) });
    expect(el(fx).textContent).not.toMatch(/exceção|aprovar|atalho/i);
  });
});
