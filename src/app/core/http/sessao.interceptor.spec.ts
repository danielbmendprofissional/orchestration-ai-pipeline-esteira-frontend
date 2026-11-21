import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NAVEGADOR } from '../auth/navegador';
import { sessaoInterceptor } from './sessao.interceptor';

const EXPIRADO = 'auth.access-token-expired';
const NAO_AUTENTICADO = 'auth.nao-autenticado';
const SESSAO_INVALIDA = 'auth.sessao-invalida';
const INDISPONIVEL = 'auth.provedor-indisponivel';
const REFRESH = { method: 'POST', url: '/api/v1/auth/refresh' };
const LOGIN = '/api/v1/auth/login?returnUrl=' + encodeURIComponent('/aplicacoes');

const corpo = (code: string, type = 'Unauthorized') => ({ errors: [{ code, message: 'm', type }] });
const NAO_AUTORIZADO = { status: 401, statusText: 'Unauthorized' };
const SEM_CONTEUDO = { status: 204, statusText: 'No Content' };
// Deixa as promessas (o refresh e a repetição da original) correrem antes da próxima asserção.
const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('[F0.5] sessaoInterceptor', () => {
  let cliente: HttpClient;
  let http: HttpTestingController;
  let irPara: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    irPara = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessaoInterceptor])),
        provideHttpClientTesting(),
        { provide: NAVEGADOR, useValue: { irPara, caminhoAtual: () => '/aplicacoes' } },
      ],
    });
    cliente = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renova a sessão e repete a requisição original quando o access token venceu', async () => {
    const resultado = firstValueFrom(cliente.get('/api/x'));

    http.expectOne('/api/x').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
    http.expectOne(REFRESH).flush(null, SEM_CONTEUDO);
    await tick();
    http.expectOne('/api/x').flush({ ok: true });

    await expect(resultado).resolves.toEqual({ ok: true });
    expect(irPara).not.toHaveBeenCalled();
  });

  it('chama o refresh uma única vez quando várias requisições vencem ao mesmo tempo', async () => {
    const resultados = [1, 2, 3].map((i) => firstValueFrom(cliente.get(`/api/x${i}`)));

    [1, 2, 3].forEach((i) => http.expectOne(`/api/x${i}`).flush(corpo(EXPIRADO), NAO_AUTORIZADO));
    http.expectOne(REFRESH).flush(null, SEM_CONTEUDO); // expectOne falha se houver mais de um refresh
    await tick();
    [1, 2, 3].forEach((i) => http.expectOne(`/api/x${i}`).flush({ i }));

    await expect(Promise.all(resultados)).resolves.toEqual([{ i: 1 }, { i: 2 }, { i: 3 }]);
  });

  it('faz um refresh novo quando o token vence de novo depois de uma renovação concluída', async () => {
    for (const rodada of [1, 2]) {
      const resultado = firstValueFrom(cliente.get('/api/x'));
      http.expectOne('/api/x').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
      http.expectOne(REFRESH).flush(null, SEM_CONTEUDO);
      await tick();
      http.expectOne('/api/x').flush({ rodada });
      await expect(resultado).resolves.toEqual({ rodada });
    }
  });

  it.each([SESSAO_INVALIDA, NAO_AUTENTICADO])(
    'vai ao login uma vez e não repete as originais quando o refresh volta 401 %s',
    async (code) => {
      const a = firstValueFrom(cliente.get('/api/a')).catch((e: unknown) => e);
      const b = firstValueFrom(cliente.get('/api/b')).catch((e: unknown) => e);

      http.expectOne('/api/a').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
      http.expectOne('/api/b').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
      http.expectOne(REFRESH).flush(corpo(code), NAO_AUTORIZADO);
      await tick();

      expect(await a).toBeInstanceOf(HttpErrorResponse);
      expect(await b).toBeInstanceOf(HttpErrorResponse);
      expect(irPara).toHaveBeenCalledTimes(1);
      expect(irPara).toHaveBeenCalledWith(LOGIN);
      // afterEach: http.verify() garante que nenhuma original foi repetida
    },
  );

  it('falha a original com o erro do refresh e mantém a página quando o provedor está indisponível', async () => {
    const resultado = firstValueFrom(cliente.get('/api/x')).catch((e: unknown) => e);

    http.expectOne('/api/x').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
    http
      .expectOne(REFRESH)
      .flush(corpo(INDISPONIVEL, 'Failure'), { status: 422, statusText: 'Unprocessable Entity' });
    await tick();

    const erro = (await resultado) as HttpErrorResponse;
    expect(erro.status).toBe(422);
    expect(erro.error.errors[0].code).toBe(INDISPONIVEL);
    expect(irPara).not.toHaveBeenCalled();
  });

  it('não tenta outro refresh se a repetição volta a vencer (sem laço)', async () => {
    const resultado = firstValueFrom(cliente.get('/api/x')).catch((e: unknown) => e);

    http.expectOne('/api/x').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
    http.expectOne(REFRESH).flush(null, SEM_CONTEUDO);
    await tick();
    http.expectOne('/api/x').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
    await tick();

    http.expectNone(REFRESH);
    expect(((await resultado) as HttpErrorResponse).status).toBe(401);
    expect(irPara).not.toHaveBeenCalled();
  });

  it.each([NAO_AUTENTICADO, SESSAO_INVALIDA])('vai ao login quando uma requisição recebe 401 %s', async (code) => {
    const resultado = firstValueFrom(cliente.get('/api/x')).catch((e: unknown) => e);

    http.expectOne('/api/x').flush(corpo(code), NAO_AUTORIZADO);
    http.expectNone(REFRESH);
    await tick();

    expect(await resultado).toBeInstanceOf(HttpErrorResponse);
    expect(irPara).toHaveBeenCalledWith(LOGIN);
  });

  it('deixa passar erros que não são de sessão, sem refresh nem login', async () => {
    const resultado = firstValueFrom(cliente.get('/api/x')).catch((e: unknown) => e);

    http.expectOne('/api/x').flush(corpo('x.invalido', 'Validation'), { status: 400, statusText: 'Bad Request' });
    await tick();

    expect(((await resultado) as HttpErrorResponse).status).toBe(400);
    expect(irPara).not.toHaveBeenCalled();
  });

  it('boot: renova e repete o /usuarios/me quando o token venceu, sem mostrar login', async () => {
    const auth = TestBed.inject(AuthService);
    const boot = auth.carregar();
    const usuario = { usuario: 'dev', nome: 'Dev', email: 'dev@esteira.local', perfis: ['mor'] };

    http.expectOne('/api/v1/usuarios/me').flush(corpo(EXPIRADO), NAO_AUTORIZADO);
    http.expectOne(REFRESH).flush(null, SEM_CONTEUDO);
    await tick();
    http.expectOne('/api/v1/usuarios/me').flush(usuario);
    await boot;

    expect(auth.usuario()).toEqual(usuario);
    expect(irPara).not.toHaveBeenCalled();
  });
});
