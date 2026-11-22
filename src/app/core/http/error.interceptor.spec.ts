import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Notificador } from '../notificacao/notificador.service';
import { codigoDoErro } from './erro-api';
import { MENSAGEM_GENERICA, errorInterceptor } from './error.interceptor';

describe('[F0.5] errorInterceptor', () => {
  let cliente: HttpClient;
  let http: HttpTestingController;
  let erro: ReturnType<typeof vi.fn>;
  let consoleErro: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    erro = vi.fn();
    consoleErro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Notificador, useValue: { erro } },
      ],
    });
    cliente = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    consoleErro.mockRestore();
  });

  const falhar = (corpo: object | string, status: number) => {
    const resultado = firstValueFrom(cliente.get('/api/x')).catch((e: unknown) => e);
    http.expectOne('/api/x').flush(corpo, { status, statusText: 'x' });
    return resultado;
  };

  it('404 sem errors[] (rota que não existe, flag desligado) não vira toast: a page trata como "não disponível"', async () => {
    const propagado = await falhar('', 404);

    expect(erro).not.toHaveBeenCalled();
    expect(propagado).toBeInstanceOf(HttpErrorResponse);
  });

  it('mostra o message de cada erro de errors[] e deixa o code disponível para a page', async () => {
    const corpo = {
      errors: [
        { code: 'aplicacao.nome-obrigatorio', message: 'Informe o nome da Aplicação.', type: 'Validation' },
        { code: 'aplicacao.url-invalida', message: 'A URL do projeto é inválida.', type: 'Validation' },
      ],
    };

    const propagado = await falhar(corpo, 400);

    expect(erro).toHaveBeenCalledTimes(2);
    expect(erro).toHaveBeenNthCalledWith(1, 'Informe o nome da Aplicação.');
    expect(erro).toHaveBeenNthCalledWith(2, 'A URL do projeto é inválida.');
    expect(propagado).toBeInstanceOf(HttpErrorResponse);
    expect(codigoDoErro(propagado)).toBe('aplicacao.nome-obrigatorio');
  });

  it.each([403, 404, 409, 422])('mostra o message dos errors[] também no status %i', async (status) => {
    await falhar({ errors: [{ code: 'x.y', message: 'Mensagem para a pessoa.', type: 'Failure' }] }, status);

    expect(erro).toHaveBeenCalledWith('Mensagem para a pessoa.');
  });

  it('mostra só a mensagem genérica para Problem Details e registra apenas o traceId no console', async () => {
    const corpo = {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
      title: 'An error occurred while processing your request.',
      status: 500,
      traceId: '00-abc123-def456-00',
      detail: 'System.InvalidOperationException: segredo interno\n   at Esteira.Api.Foo()',
    };

    await falhar(corpo, 500);

    expect(erro).toHaveBeenCalledTimes(1);
    expect(erro).toHaveBeenCalledWith(MENSAGEM_GENERICA);
    expect(consoleErro).toHaveBeenCalledTimes(1);
    const registrado = JSON.stringify(consoleErro.mock.calls);
    expect(registrado).toContain('00-abc123-def456-00');
    expect(registrado).not.toContain('segredo interno');
    expect(registrado).not.toContain('InvalidOperationException');
  });

  it('mostra a mensagem genérica quando a rede falha (sem resposta)', async () => {
    const resultado = firstValueFrom(cliente.get('/api/x')).catch((e: unknown) => e);
    http.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await resultado;

    expect(erro).toHaveBeenCalledWith(MENSAGEM_GENERICA);
  });

  it('mostra a mensagem genérica quando o corpo de erro não tem a forma esperada (ex.: HTML do proxy)', async () => {
    await falhar('<html>Bad Gateway</html>', 502);

    expect(erro).toHaveBeenCalledWith(MENSAGEM_GENERICA);
    expect(JSON.stringify(erro.mock.calls)).not.toContain('Bad Gateway');
  });

  it('não mostra nada no 401: a sessão já tratou (renovação ou login)', async () => {
    await falhar({ errors: [{ code: 'auth.nao-autenticado', message: 'Faça login.', type: 'Unauthorized' }] }, 401);

    expect(erro).not.toHaveBeenCalled();
  });

  it('não mostra toast para erro de requisição que não é da API', async () => {
    const resultado = firstValueFrom(cliente.get('https://terceiro.example/x')).catch((e: unknown) => e);
    http
      .expectOne('https://terceiro.example/x')
      .flush({ errors: [{ code: 'x.y', message: 'texto de terceiro', type: 'Failure' }] }, { status: 422, statusText: 'x' });
    await resultado;

    expect(erro).not.toHaveBeenCalled();
  });

  it('não interfere na resposta de sucesso', async () => {
    const resultado = firstValueFrom(cliente.get('/api/x'));
    http.expectOne('/api/x').flush({ ok: true });

    await expect(resultado).resolves.toEqual({ ok: true });
    expect(erro).not.toHaveBeenCalled();
  });
});
