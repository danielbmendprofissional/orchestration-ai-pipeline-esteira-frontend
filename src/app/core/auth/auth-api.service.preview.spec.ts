import { AuthApiService as Real, type UsuarioLogado } from './auth-api.service';
import { AuthApiService as Preview } from './auth-api.service.preview';

// No build `preview` o angular.json troca auth-api.service.ts por auth-api.service.preview.ts
// (fileReplacements). O TypeScript não vê a troca, então este teste segura o contrato: mesma superfície
// pública e dado tipado pelo contrato gerado.
describe('[F0.5] AuthApiService do preview', () => {
  it('expõe a mesma superfície pública do serviço real', () => {
    const publicos = (tipo: { prototype: object }) =>
      Object.getOwnPropertyNames(tipo.prototype)
        .filter((nome) => nome !== 'constructor')
        .sort();

    expect(publicos(Preview)).toEqual(publicos(Real));
  });

  it('devolve uma sessão falsa já logada com o perfil mor, sem chamar API', async () => {
    const preview = new Preview();

    const usuario: UsuarioLogado = await preview.me();

    expect(usuario.perfis).toContain('mor');
    expect(usuario.nome).not.toBe('');
    await expect(preview.refresh()).resolves.toBeUndefined();
  });
});
