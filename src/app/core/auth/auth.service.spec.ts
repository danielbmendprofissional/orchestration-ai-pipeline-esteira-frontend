import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { NAVEGADOR } from './navegador';

const ME = { usuario: 'dev', nome: 'Dev Esteira', email: 'dev@esteira.local', perfis: ['mor'] };

describe('[F0.5] AuthService', () => {
  let servico: AuthService;
  let http: HttpTestingController;
  let irPara: ReturnType<typeof vi.fn>;
  let caminho: string;

  beforeEach(() => {
    irPara = vi.fn();
    caminho = '/aplicacoes?aba=projetos';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NAVEGADOR, useValue: { irPara, caminhoAtual: () => caminho } },
      ],
    });
    servico = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('chama /usuarios/me uma vez no boot e guarda o usuário no signal', async () => {
    expect(servico.usuario()).toBeNull();

    const boot = servico.carregar();
    http.expectOne('/api/v1/usuarios/me').flush(ME);
    await boot;

    expect(servico.usuario()).toEqual(ME);
    expect(irPara).not.toHaveBeenCalled();
  });

  it.each(['auth.nao-autenticado', 'auth.sessao-invalida'])(
    'vai ao login com o returnUrl atual quando o me volta 401 %s',
    async (code) => {
      const boot = servico.carregar();
      http
        .expectOne('/api/v1/usuarios/me')
        .flush({ errors: [{ code, message: 'x', type: 'Unauthorized' }] }, { status: 401, statusText: 'Unauthorized' });
      await boot;

      expect(irPara).toHaveBeenCalledTimes(1);
      expect(irPara).toHaveBeenCalledWith('/api/v1/auth/login?returnUrl=' + encodeURIComponent('/aplicacoes?aba=projetos'));
      expect(servico.usuario()).toBeNull();
    },
  );

  it('usa "/" no login quando o caminho atual não é interno', () => {
    caminho = '//evil.example/x';

    servico.entrar();

    expect(irPara).toHaveBeenCalledWith('/api/v1/auth/login?returnUrl=' + encodeURIComponent('/'));
  });

  it('navega ao login uma vez só, mesmo com várias requisições recebendo 401 ao mesmo tempo', () => {
    servico.entrar();
    servico.entrar();
    servico.entrar();

    expect(irPara).toHaveBeenCalledTimes(1);
  });

  it('propaga a falha do boot que não é 401 (a casca não sobe com sessão desconhecida)', async () => {
    const boot = servico.carregar();
    http.expectOne('/api/v1/usuarios/me').flush('', { status: 500, statusText: 'Server Error' });

    await expect(boot).rejects.toThrow();
    expect(irPara).not.toHaveBeenCalled();
  });

  it('sair navega a página inteira para o logout da API', () => {
    servico.sair();

    expect(irPara).toHaveBeenCalledWith('/api/v1/auth/logout');
  });
});
