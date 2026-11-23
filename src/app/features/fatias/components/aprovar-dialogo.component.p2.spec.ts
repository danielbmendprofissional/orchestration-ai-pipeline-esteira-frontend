import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AprovarDialogoComponent } from './aprovar-dialogo.component';
import type { ErroDaDecisao, MrParaAprovar } from './decisao-dialogo.tipos';

describe('[P2] AprovarDialogoComponent', () => {
  let fixture: ComponentFixture<AprovarDialogoComponent>;
  let confirmou: ReturnType<typeof vi.fn<() => void>>;
  let cancelou: ReturnType<typeof vi.fn<() => void>>;

  async function montar(entradas: { aberto?: boolean; enviando?: boolean; erro?: ErroDaDecisao | null; mrs?: MrParaAprovar[] } = {}) {
    fixture = TestBed.createComponent(AprovarDialogoComponent);
    const valores = {
      aberto: true, codigo: 'P2', enviando: false, erro: null,
      mrs: [{ repositorio: 'api', iid: 7, titulo: 'P2: review' }, { repositorio: 'frontend', iid: 9, titulo: 'P2: telas' }],
      ...entradas,
    };
    for (const [k, v] of Object.entries(valores)) fixture.componentRef.setInput(k, v);
    confirmou = vi.fn<() => void>();
    cancelou = vi.fn<() => void>();
    fixture.componentInstance.confirmar.subscribe(() => confirmou());
    fixture.componentInstance.cancelar.subscribe(() => cancelou());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const confirmar = () => document.querySelector<HTMLButtonElement>('[data-testid="aprovar-confirmar"]')!;

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('fechado não desenha nada', async () => {
    await montar({ aberto: false });
    expect(dialogo()).toBeNull();
  });

  it('diz o que vai acontecer: mergeia na main com o flag desligado, API primeiro', async () => {
    await montar();
    expect(dialogo()!.getAttribute('aria-labelledby')).toBeTruthy();
    const texto = dialogo()!.textContent!;
    expect(texto).toContain('Aprovar P2');
    expect(texto).toContain('mergeia na main');
    expect(texto).toContain('Features:P2');
    expect(texto).toContain('a API primeiro');
  });

  it('lista as MRs, API antes do front, com número e título', async () => {
    await montar({ mrs: [{ repositorio: 'frontend', iid: 9, titulo: 'P2: telas' }, { repositorio: 'api', iid: 7, titulo: 'P2: review' }] });
    const itens = Array.from(dialogo()!.querySelectorAll('[data-testid="aprovar-mr"]')).map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(itens).toHaveLength(2);
    expect(itens[0]).toContain('API');
    expect(itens[0]).toContain('!7');
    expect(itens[0]).toContain('P2: review');
    expect(itens[1]).toContain('Front');
    expect(itens[1]).toContain('!9');
  });

  it('sem número de MR (gaveta não lida) lista só o projeto', async () => {
    await montar({ mrs: [{ repositorio: 'api' }] });
    const item = dialogo()!.querySelector('[data-testid="aprovar-mr"]')!;
    expect(item.textContent).toContain('API');
    expect(item.textContent).not.toContain('!');
  });

  it('título de MR com marcação é mostrado como texto', async () => {
    await montar({ mrs: [{ repositorio: 'api', iid: 1, titulo: '<b onmouseover=x>negrito</b>' }] });
    expect(dialogo()!.querySelector('b')).toBeNull();
    expect(dialogo()!.textContent).toContain('<b onmouseover=x>negrito</b>');
  });

  it('Aprovar confirma uma vez; Cancelar pede para fechar', async () => {
    await montar();
    confirmar().click();
    expect(confirmou).toHaveBeenCalledTimes(1);
    document.querySelector<HTMLButtonElement>('[data-testid="aprovar-cancelar"]')!.click();
    expect(cancelou).toHaveBeenCalledTimes(1);
  });

  it('enviando desativa o botão e avisa', async () => {
    await montar({ enviando: true });
    expect(confirmar().disabled).toBe(true);
    expect(confirmar().textContent).toContain('Aprovando');
  });

  it('mostra o erro de negócio com o texto da API e o liga ao diálogo por aria-describedby', async () => {
    await montar({ erro: { codigo: 'fatia.ci-nao-verde', mensagem: 'O CI da MR !7 não está verde.' } });
    const alerta = dialogo()!.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alerta.textContent).toContain('O CI da MR !7 não está verde.');
    expect(dialogo()!.getAttribute('aria-describedby')!.split(' ')).toContain(alerta.id);
  });
});
