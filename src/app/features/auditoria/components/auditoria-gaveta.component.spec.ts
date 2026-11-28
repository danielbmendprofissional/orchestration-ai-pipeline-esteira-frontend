import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { RegistroDetalhe } from '../auditoria.tipos';
import { AuditoriaGavetaComponent } from './auditoria-gaveta.component';

const detalhe = (extra: Partial<RegistroDetalhe> = {}): RegistroDetalhe => ({
  id: 'r1', quando: new Date(2026, 10, 28, 15, 40).toISOString(), quem: { nome: 'Carla <i>M</i>', origem: 'tela' }, categoria: 'cadastro', verbo: 'alterou a Aplicação',
  objeto: { codigo: 'VLT', nome: 'Valuto', entidade: 'Aplicacao', entidadeId: 'app-1' }, aplicacao: { id: 'a1', nome: 'Valuto' }, autoaprovacao: false,
  mudancas: [{ campo: 'teto', antes: '40', depois: '60' }, { campo: 'nota', antes: '—', depois: 'nova' }], motivo: 'Pedido do cliente', ...extra,
});

describe('[X1] AuditoriaGavetaComponent', () => {
  let fixture: ComponentFixture<AuditoriaGavetaComponent>;
  const fechar = vi.fn<() => void>();
  const tentar = vi.fn<() => void>();

  async function montar(entradas: Record<string, unknown> = {}) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(AuditoriaGavetaComponent);
    for (const [k, v] of Object.entries({ aberta: true, detalhe: detalhe(), carregando: false, naoEncontrado: false, falhou: false, ...entradas })) fixture.componentRef.setInput(k, v);
    fixture.componentInstance.fechar.subscribe(() => fechar());
    fixture.componentInstance.tentarDeNovo.subscribe(() => tentar());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const painel = () => document.querySelector<HTMLElement>('[data-testid="gaveta"]');

  beforeEach(() => { fechar.mockClear(); tentar.mockClear(); });
  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('é um diálogo com Quando, Quem e origem, Aplicação, Objeto, tabela Campo × Antes × Depois e Motivo (critério 14)', async () => {
    await montar();
    expect(painel()!.closest('[role="dialog"]')).not.toBeNull();
    const t = painel()!.textContent!;
    expect(t).toContain('15:40');
    expect(t).toContain('Carla <i>M</i>');
    expect(t).toContain('Tela da Esteira');
    expect(t).toContain('Valuto');
    expect(t).toContain('VLT');
    expect(painel()!.querySelector('i')).toBeNull();
    expect(Array.from(painel()!.querySelectorAll('thead th')).map((h) => h.textContent!.trim())).toEqual(['Campo', 'Antes', 'Depois']);
    const linhas = painel()!.querySelectorAll('tbody tr');
    expect(linhas).toHaveLength(2);
    expect(linhas[0].textContent).toContain('40');
    expect(linhas[0].textContent).toContain('60');
    expect(t).toContain('Motivo');
    expect(t).toContain('Pedido do cliente');
  });

  it('sem motivo, não desenha a seção; origem do bot tem nome próprio', async () => {
    await montar({ detalhe: detalhe({ motivo: null, quem: { nome: 'Bot da Esteira', origem: 'bot' } }) });
    expect(painel()!.textContent).not.toContain('Motivo');
    expect(painel()!.textContent).toContain('Bot da Esteira, no GitLab');
  });

  it('"Abrir <código>" leva à tela do objeto; entidade sem tela conhecida: sem botão', async () => {
    await montar();
    const a = painel()!.querySelector<HTMLAnchorElement>('[data-testid="abrir-objeto"]')!;
    expect(a.textContent).toContain('Abrir VLT');
    expect(a.getAttribute('href')).toBe('/aplicacoes/app-1');
    await montar({ detalhe: detalhe({ objeto: { codigo: 'X', nome: null, entidade: 'Destino', entidadeId: 'd' } }) });
    expect(painel()!.querySelector('[data-testid="abrir-objeto"]')).toBeNull();
  });

  it('Fechar emite fechar; fechada não desenha nada', async () => {
    await montar();
    painel()!.querySelector<HTMLButtonElement>('[data-testid="gaveta-fechar"]')!.click();
    expect(fechar).toHaveBeenCalled();
    await montar({ aberta: false });
    expect(painel()).toBeNull();
  });

  it('404: não encontrado (inexistente ou sem acesso), sem tabela; erro: "Tentar de novo"; carregando: status', async () => {
    await montar({ detalhe: null, naoEncontrado: true });
    expect(painel()!.querySelector('[data-testid="nao-encontrado"]')!.textContent).toContain('Registro não encontrado ou sem acesso');
    expect(painel()!.querySelector('table')).toBeNull();
    await montar({ detalhe: null, falhou: true });
    painel()!.querySelector<HTMLButtonElement>('[data-testid="tentar-de-novo"]')!.click();
    expect(tentar).toHaveBeenCalled();
    await montar({ detalhe: null, carregando: true });
    expect(painel()!.querySelector('[role="status"]')!.textContent).toContain('Carregando');
  });
});
