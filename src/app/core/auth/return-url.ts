/**
 * Só caminho interno da mesma origem vira destino de redirecionamento (ADR-0004; a API confere de novo).
 * Começa com `/`, não com `//` nem `/\`, sem esquema, host nem caractere de controle (o navegador
 * descarta tab e quebra de linha ao interpretar uma URL, então `/\t/host` viraria `//host`).
 * Qualquer outra coisa — ou ausente — volta para a raiz.
 */
export function returnUrlSeguro(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith('/')) return '/';
  if (valor.startsWith('//') || valor.startsWith('/\\')) return '/';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(valor)) return '/';
  return valor;
}
