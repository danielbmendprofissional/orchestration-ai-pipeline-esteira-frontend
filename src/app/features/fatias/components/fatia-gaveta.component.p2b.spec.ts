import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AcaoDaFatia, FatiaDoPainel, Gaveta } from '../fatias.tipos';
import { FatiaGavetaComponent } from './fatia-gaveta.component';

const fatia: FatiaDoPainel = {
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P2b', titulo: 'Ações do bot', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
};
const pode = { pode: true, motivo: null };
const acao = (extra: Partial<AcaoDaFatia> = {}): AcaoDaFatia => ({
  id: 'x1', tipo: 'aprovar', estado: 'falhou', repositorio: 'api', mrIid: 7, pedidaPor: 'Ana Souza',
  pedidaEm: '2026-11-23T10:00:00Z', atualizadaEm: '2026-11-23T10:00:00Z', codigoErro: 'gitlab.merge-recusado', comentario: null, podeReexecutar: pode, ...extra,
});
const gaveta = (acoesPedidas: AcaoDaFatia[]): Gaveta => ({
  aplicacaoId: 'a1', codigo: 'P2b', titulo: 'Ações do bot', estado: 'em-revisao', progresso: null, emCorrecao: false, formatoAnterior: false,
  spec: { disponivel: true, caminho: 'specs/p2b.md', link: null, risco: 'alto', formatoAnterior: false },
  mae: null, filhas: [], repositorios: [], tasks: [], acoesPedidas,
});

describe('[P2b] FatiaGavetaComponent: Reexecutar', () => {
  let fixture: ComponentFixture<FatiaGavetaComponent>;
  let reexecutadas: string[];

  async function montar(g: Gaveta, entradas: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(FatiaGavetaComponent);
    fixture.componentRef.setInput('aberta', true);
    fixture.componentRef.setInput('fatia', fatia);
    fixture.componentRef.setInput('gaveta', g);
    fixture.componentRef.setInput('acoesLigadas', true);
    for (const [nome, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nome, valor);
    reexecutadas = [];
    fixture.componentInstance.reexecutar.subscribe((a) => reexecutadas.push(a.id));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const botoes = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="gaveta-reexecutar"]'));

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('ação falhou com permissão: botão Reexecutar habilitado, com o código do erro ainda visível, e o clique emite a Ação', async () => {
    await montar(gaveta([acao()]));
    expect(botoes()).toHaveLength(1);
    expect(botoes()[0].textContent).toContain('Reexecutar');
    expect(botoes()[0].disabled).toBe(false);
    expect(document.querySelector('[data-testid="gaveta-acoes"]')!.textContent).toContain('gitlab.merge-recusado');
    botoes()[0].click();
    expect(reexecutadas).toEqual(['x1']);
  });

  it('só as ações falhou ganham o botão', async () => {
    await montar(gaveta([
      acao({ id: 'a', estado: 'confirmada', codigoErro: null, podeReexecutar: { pode: false, motivo: 'nao-falhou' } }),
      acao({ id: 'b', estado: 'pedida', codigoErro: null, podeReexecutar: { pode: false, motivo: 'nao-falhou' } }),
      acao({ id: 'c' }),
    ]));
    expect(botoes()).toHaveLength(1);
  });

  it('sem permissão: desativado, com o motivo (texto) no title, e não emite', async () => {
    await montar(gaveta([acao({ podeReexecutar: { pode: false, motivo: 'papel' } })]));
    const b = botoes()[0];
    expect(b.disabled).toBe(true);
    expect(b.title).toBe('Seu papel não permite esta ação.');
    b.click();
    expect(reexecutadas).toEqual([]);
  });

  it('motivo desconhecido volta como a API mandou', async () => {
    await montar(gaveta([acao({ podeReexecutar: { pode: false, motivo: 'motivo-novo' } })]));
    expect(botoes()[0].title).toBe('motivo-novo');
  });

  it('flag desligada: nenhum botão', async () => {
    await montar(gaveta([acao()]), { acoesLigadas: false });
    expect(botoes()).toHaveLength(0);
  });

  it('reexecutando: o botão fica desativado para não duplicar o pedido', async () => {
    await montar(gaveta([acao()]), { reexecutando: true });
    expect(botoes()[0].disabled).toBe(true);
  });

  it('aviso de erro vira texto (sem criar elemento) em role=alert; aviso de sucesso em role=status', async () => {
    await montar(gaveta([acao()]), { aviso: { tipo: 'erro', texto: '<b>A Ação não pode ser reexecutada.</b>' } });
    const alerta = document.querySelector<HTMLElement>('[data-testid="gaveta-aviso"]')!;
    expect(alerta.getAttribute('role')).toBe('alert');
    expect(alerta.querySelector('b')).toBeNull();
    expect(alerta.textContent).toContain('<b>A Ação não pode ser reexecutada.</b>');

    fixture.componentRef.setInput('aviso', { tipo: 'ok', texto: 'Reexecução pedida.' });
    fixture.detectChanges();
    expect(document.querySelector('[data-testid="gaveta-aviso"]')!.getAttribute('role')).toBe('status');
  });
});
