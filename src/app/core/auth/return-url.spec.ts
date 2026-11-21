import { returnUrlSeguro } from './return-url';

describe('[F0.5] returnUrlSeguro', () => {
  it.each(['/', '/aplicacoes', '/aplicacoes/42?aba=projetos', '/a#secao'])('aceita o caminho interno %s', (valor) => {
    expect(returnUrlSeguro(valor)).toBe(valor);
  });

  it.each([
    ['vazio', ''],
    ['nulo', null],
    ['indefinido', undefined],
    ['só espaços', '   '],
    ['relativo sem barra', 'aplicacoes'],
    ['protocol-relative', '//evil.example/x'],
    ['barra invertida', '/\\evil.example'],
    ['esquema http', 'http://evil.example'],
    ['esquema https', 'https://evil.example/x'],
    ['javascript', 'javascript:alert(1)'],
    ['quebra de linha', '/ok\nSet-Cookie: x=1'],
    ['tabulação antes de barra', '/\t/evil.example'],
  ])('troca por "/" quando é %s', (_nome, valor) => {
    expect(returnUrlSeguro(valor as string | null | undefined)).toBe('/');
  });
});
