import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ResultadoComando } from '../aplicacoes.service';
import type { TetoCusto } from '../aplicacoes.tipos';
import { TetoCustoCampoComponent } from './teto-custo-campo.component';

const padrao: TetoCusto = { padraoUsd: 2, efetivoUsd: 2 };
const definido: TetoCusto = { tetoCustoUsd: 5, padraoUsd: 2, efetivoUsd: 5 };

describe('[X3] TetoCustoCampoComponent', () => {
  let fixture: ComponentFixture<TetoCustoCampoComponent>;
  let definir: ReturnType<typeof vi.fn<(v: number | null) => Promise<ResultadoComando>>>;
  let raiz: HTMLElement;

  async function montar(teto: TetoCusto | undefined, podeEditar = true, erro: string | null = null) {
    definir = vi.fn(async () => ({ ok: true }) as ResultadoComando);
    fixture = TestBed.createComponent(TetoCustoCampoComponent);
    fixture.componentRef.setInput('teto', teto);
    fixture.componentRef.setInput('podeEditar', podeEditar);
    fixture.componentRef.setInput('erro', erro);
    fixture.componentRef.setInput('definir', definir);
    raiz = fixture.nativeElement as HTMLElement;
    await estavel();
  }
  const estavel = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const el = <T extends HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`);
  const abrir = async () => {
    el<HTMLButtonElement>('teto-alterar')!.click();
    await estavel();
  };
  const digitar = async (texto: string) => {
    const i = el<HTMLInputElement>('teto-input')!;
    i.value = texto;
    i.dispatchEvent(new Event('input', { bubbles: true }));
    await estavel();
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('mostra o teto definido em US$ por execução, sem a marca de padrão', async () => {
    await montar(definido);

    expect(raiz.textContent).toContain('Teto de custo dos agentes (US$ por execução)');
    expect(el('teto-valor')?.textContent).toContain('5,00');
    expect(raiz.textContent).not.toContain('padrão da Esteira');
  });

  it('sem teto definido mostra o efetivo com a marca "padrão da Esteira"', async () => {
    await montar(padrao);

    expect(el('teto-valor')?.textContent).toContain('2,00');
    expect(raiz.textContent).toContain('padrão da Esteira');
  });

  it('sem podeEditar não mostra o botão "Alterar teto"', async () => {
    await montar(padrao, false);

    expect(el('teto-valor')).not.toBeNull();
    expect(el('teto-alterar')).toBeNull();
  });

  it('a gaveta explica o escopo: só agentes do CI, sem limitar o uso pessoal', async () => {
    await montar(padrao);
    await abrir();

    const texto = document.querySelector('[role=dialog]')?.textContent ?? '';
    expect(texto).toContain('agentes do CI');
    expect(texto).toContain('não limita');
  });

  it('salva o valor digitado como número', async () => {
    await montar(padrao);
    await abrir();
    await digitar('3.5');

    el<HTMLButtonElement>('teto-salvar')!.click();
    await estavel();

    expect(definir).toHaveBeenCalledWith(3.5);
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('aceita vírgula decimal', async () => {
    await montar(padrao);
    await abrir();
    await digitar('7,25');

    el<HTMLButtonElement>('teto-salvar')!.click();
    await estavel();

    expect(definir).toHaveBeenCalledWith(7.25);
  });

  it('"Usar padrão da Esteira" manda null', async () => {
    await montar(definido);
    await abrir();

    el<HTMLButtonElement>('teto-padrao')!.click();
    await estavel();

    expect(definir).toHaveBeenCalledWith(null);
  });

  it('texto que não é número não chama a API e mostra o erro no campo', async () => {
    await montar(padrao);
    await abrir();
    await digitar('abc');

    el<HTMLButtonElement>('teto-salvar')!.click();
    await estavel();

    expect(definir).not.toHaveBeenCalled();
    expect(el('teto-erro')?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('erro da API aparece no campo, ligado por aria-describedby, e a gaveta continua aberta', async () => {
    await montar(padrao);
    await abrir();
    fixture.componentRef.setInput('erro', 'O teto precisa ficar entre 0,10 e 50,00 dólares.');
    await estavel();

    const erro = el('teto-erro')!;
    expect(erro.textContent).toContain('entre 0,10 e 50,00');
    expect(erro.getAttribute('role')).toBe('alert');
    expect(el('teto-input')!.getAttribute('aria-describedby')).toContain(erro.id);
    expect(el('teto-input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('recusa da API (ok:false) mantém a gaveta aberta', async () => {
    await montar(padrao);
    definir.mockResolvedValue({ ok: false, campo: 'tetoCusto', mensagem: 'x' });
    await abrir();
    await digitar('99');

    el<HTMLButtonElement>('teto-salvar')!.click();
    await estavel();

    expect(document.querySelector('[role=dialog]')).not.toBeNull();
  });
});
