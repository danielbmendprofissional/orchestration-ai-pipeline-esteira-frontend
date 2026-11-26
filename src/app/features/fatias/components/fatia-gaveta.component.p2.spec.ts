import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AcaoDaFatia, FatiaDoPainel, Gaveta } from '../fatias.tipos';
import { FatiaGavetaComponent } from './fatia-gaveta.component';

const fatia: FatiaDoPainel = {
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P2', titulo: 'Review', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
};
const acao = (extra: Partial<AcaoDaFatia> = {}): AcaoDaFatia => ({
  id: 'x1', tipo: 'reprovar', estado: 'pedida', repositorio: 'api', mrIid: 7, pedidaPor: 'Ana Souza',
  pedidaEm: '2026-11-23T10:00:00Z', atualizadaEm: '2026-11-23T10:00:00Z', codigoErro: null, comentario: null, podeReexecutar: { pode: false, motivo: 'nao-falhou' }, ...extra,
});
const gaveta = (extra: Partial<Gaveta> = {}): Gaveta => ({
  aplicacaoId: 'a1', codigo: 'P2', titulo: 'Review', estado: 'em-revisao', progresso: null, emCorrecao: false, formatoAnterior: false,
  spec: { disponivel: true, caminho: 'specs/p2.md', link: null, risco: 'alto', formatoAnterior: false },
  mae: null, filhas: [], repositorios: [], tasks: [], ...extra,
});

describe('[P2] FatiaGavetaComponent: Ações do bot', () => {
  let fixture: ComponentFixture<FatiaGavetaComponent>;

  async function montar(g: Gaveta, acoesLigadas: boolean) {
    fixture = TestBed.createComponent(FatiaGavetaComponent);
    fixture.componentRef.setInput('aberta', true);
    fixture.componentRef.setInput('fatia', fatia);
    fixture.componentRef.setInput('gaveta', g);
    fixture.componentRef.setInput('acoesLigadas', acoesLigadas);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const secao = () => document.querySelector<HTMLElement>('[data-testid="gaveta-acoes"]');

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('flag desligada: não mostra a seção, mesmo que a API mande as ações', async () => {
    await montar(gaveta({ acoesPedidas: [acao()] }), false);
    expect(secao()).toBeNull();
  });

  it('flag ligada: lista tipo, estado (ícone e texto), repositório, MR, quem pediu e quando', async () => {
    await montar(gaveta({ acoesPedidas: [acao()] }), true);
    const item = secao()!.querySelector('[data-testid="gaveta-acao"]')!;
    expect(secao()!.querySelector('h3')!.textContent).toContain('Ações do bot');
    expect(item.textContent).toContain('Reprovar');
    expect(item.textContent).toContain('pedida');
    expect(item.querySelector('ng-icon')).not.toBeNull();
    expect(item.textContent).toContain('!7');
    expect(item.textContent).toContain('Ana Souza');
    expect(item.querySelector('time')).not.toBeNull();
  });

  it('ação falhada mostra o código do erro', async () => {
    await montar(gaveta({ acoesPedidas: [acao({ estado: 'falhou', codigoErro: 'gitlab.merge-recusado' })] }), true);
    expect(secao()!.textContent).toContain('gitlab.merge-recusado');
  });

  it('comentário do humano com marcação aparece como texto, sem criar elemento', async () => {
    await montar(gaveta({ acoesPedidas: [acao({ comentario: '<img src=x onerror=alert(1)><b>oi</b>' })] }), true);
    expect(secao()!.querySelector('img, b')).toBeNull();
    expect(secao()!.textContent).toContain('<img src=x onerror=alert(1)><b>oi</b>');
  });

  it('sem ações pedidas diz que não há nenhuma', async () => {
    await montar(gaveta({ acoesPedidas: [] }), true);
    expect(secao()!.textContent).toContain('Nenhuma ação pedida');
  });

  it('API sem o campo (acoesPedidas ausente): não mostra a seção', async () => {
    await montar(gaveta(), true);
    expect(secao()).toBeNull();
  });
});
