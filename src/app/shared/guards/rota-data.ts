/**
 * Metadado de rota (`data`) lido por dois consumidores: o `perfilGuard` e o menu do shell.
 * O mesmo dado serve aos dois, então item de menu e rota nunca divergem.
 */
export interface RotaData {
  /** Presente = a rota aparece no menu. */
  menu?: { rotulo: string; icone: string };
  /** Perfis (de `realm_access.roles`, via `/usuarios/me`) que podem abrir a rota; ausente ou vazio = qualquer usuário logado. */
  perfis?: string[];
}
