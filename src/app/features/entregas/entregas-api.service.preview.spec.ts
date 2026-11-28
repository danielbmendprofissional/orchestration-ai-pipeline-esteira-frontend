import { HttpErrorResponse } from '@angular/common/http';
import { EntregasApiService as Real } from './entregas-api.service';
import { EntregasApiService, ENTREGAS_DO_PREVIEW, avancarEntregaFalsa, reiniciarEntregasDoPreview } from './entregas-api.service.preview';

describe('[E1b] EntregasApiService (preview)', () => {
  const api = new EntregasApiService();
  beforeEach(() => reiniciarEntregasDoPreview());
  const [e1, e2, e3, e4] = ENTREGAS_DO_PREVIEW;
  const estados = async (id: string) => (await api.obter(id)).fluxos[0].etapas.map((e) => `${e.etapa}:${e.estado}`);

  it('tem a mesma superfície pública do serviço real', () => {
    const publicos = (c: object) => Object.getOwnPropertyNames(c).filter((n) => n !== 'constructor').sort();
    expect(publicos(EntregasApiService.prototype)).toEqual(publicos(Real.prototype));
  });

  it('um cenário por estado da spec', async () => {
    expect(await estados(e1)).toEqual(['abertura:concluido', 'qa:executando', 'hml:nao-iniciado', 'prd:nao-iniciado']);
    expect(await estados(e2)).toContain('hml:aguardando-aprovacao');
    expect(await estados(e3)).toContain('qa:falhou');
    expect(await estados(e4)).toEqual(['abertura:concluido', 'qa:pulada', 'hml:pulada', 'prd:concluido']);
  });

  it('o Atalho traz quem pulou e o motivo; a falha traz o código', async () => {
    const atalho = (await api.obter(e4)).fluxos[0].etapas.find((e) => e.etapa === 'qa');
    expect(atalho?.pulada?.por).toBeTruthy();
    expect(atalho?.pulada?.motivo).toBeTruthy();
    const falha = (await api.obter(e3)).fluxos[0].etapas.find((e) => e.etapa === 'qa');
    expect(falha?.codigoFalha).toBe('pipeline.falhou');
  });

  it('id fora do exemplo é 404', async () => {
    const erro = await api.obter('nao-existe').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(HttpErrorResponse);
    expect((erro as HttpErrorResponse).status).toBe(404);
  });

  it('o evento de desenvolvimento avança a Etapa em andamento', async () => {
    avancarEntregaFalsa(e1);
    expect(await estados(e1)).toContain('qa:aguardando-aprovacao');
    expect((await api.obter(e1)).estado).toBe('aguardando-aprovacao');
  });
});
