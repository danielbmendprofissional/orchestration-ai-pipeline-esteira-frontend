import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ErroDaDecisao } from './decisao-dialogo.tipos';
import { ReprovarDialogoComponent } from './reprovar-dialogo.component';

describe('[P2] ReprovarDialogoComponent', () => {
  let fixture: ComponentFixture<ReprovarDialogoComponent>;
  let confirmados: string[];
  let cancelou: ReturnType<typeof vi.fn<() => void>>;

  async function montar(entradas: { aberto?: boolean; enviando?: boolean; erro?: ErroDaDecisao | null } = {}) {
    fixture = TestBed.createComponent(ReprovarDialogoComponent);
    const valores = { aberto: true, codigo: 'P2', enviando: false, erro: null, ...entradas };
    for (const [k, v] of Object.entries(valores)) fixture.componentRef.setInput(k, v);
    confirmados = [];
    cancelou = vi.fn<() => void>();
    fixture.componentInstance.confirmar.subscribe((c) => confirmados.push(c));
    fixture.componentInstance.cancelar.subscribe(() => cancelou());
    await estavel();
  }
  const estavel = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const campo = () => document.querySelector<HTMLTextAreaElement>('[data-testid="reprovar-comentario"]')!;
  const enviar = () => document.querySelector<HTMLButtonElement>('[data-testid="reprovar-confirmar"]')!;
  const digitar = async (texto: string) => {
    campo().value = texto;
    campo().dispatchEvent(new Event('input'));
    await estavel();
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((o) => (o.innerHTML = '')));

  it('fechado não desenha nada', async () => {
    await montar({ aberto: false });
    expect(dialogo()).toBeNull();
  });

  it('é um diálogo nomeado com o código da Fatia, com campo Comentário rotulado e o aviso do nome', async () => {
    await montar();
    expect(dialogo()!.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialogo()!.textContent).toContain('Reprovar P2');
    const rotulo = document.querySelector<HTMLLabelElement>(`label[for="${campo().id}"]`)!;
    expect(rotulo.textContent).toContain('Comentário');
    expect(dialogo()!.textContent).toContain('será postado na MR com o seu nome');
    expect(campo().required).toBe(true);
  });

  it('comentário obrigatório: Reprovar fica desativado com o campo vazio ou só com espaços', async () => {
    await montar();
    expect(enviar().disabled).toBe(true);
    await digitar('   ');
    expect(enviar().disabled).toBe(true);
    await digitar('faltou o teste');
    expect(enviar().disabled).toBe(false);
  });

  it('mostra o contador de 2000 e passa a avisar quando estoura', async () => {
    await montar();
    const contador = () => document.querySelector('[data-testid="reprovar-contador"]')!;
    expect(contador().textContent).toContain('0 / 2000');
    await digitar('abc');
    expect(contador().textContent).toContain('3 / 2000');
    await digitar('x'.repeat(2001));
    expect(contador().textContent).toContain('2001 / 2000');
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(enviar().disabled).toBe(true);
  });

  it('confirma com o comentário sem espaços nas pontas', async () => {
    await montar();
    await digitar('  refaça o teste  ');
    enviar().click();
    expect(confirmados).toEqual(['refaça o teste']);
  });

  it('enviando: não confirma de novo e avisa o estado', async () => {
    await montar({ enviando: true });
    await digitar('ok');
    expect(enviar().disabled).toBe(true);
    expect(enviar().textContent).toContain('Reprovando');
  });

  it('mostra o erro de negócio no próprio diálogo, ligado ao campo por aria-describedby', async () => {
    await montar({ erro: { codigo: 'fatia.sem-mr-aberta', mensagem: 'A Fatia não tem MR aberta.' } });
    const alerta = dialogo()!.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alerta.textContent).toContain('A Fatia não tem MR aberta.');
    expect(campo().getAttribute('aria-describedby')!.split(' ')).toContain(alerta.id);
  });

  it('erro sem mensagem usa um texto padrão', async () => {
    await montar({ erro: { codigo: null, mensagem: null } });
    expect(dialogo()!.querySelector('[role="alert"]')!.textContent!.trim()).not.toBe('');
  });

  it('marcação no comentário é digitada e mostrada como texto, nunca interpretada', async () => {
    await montar();
    await digitar('<img src=x onerror=alert(1)>');
    expect(dialogo()!.querySelector('img')).toBeNull();
  });

  it('o foco entra no campo; Cancelar e Esc pedem para fechar', async () => {
    await montar();
    expect(document.activeElement).toBe(campo());
    document.querySelector<HTMLButtonElement>('[data-testid="reprovar-cancelar"]')!.click();
    expect(cancelou).toHaveBeenCalledTimes(1);
    dialogo()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await estavel();
    expect(cancelou).toHaveBeenCalledTimes(2);
  });
});
