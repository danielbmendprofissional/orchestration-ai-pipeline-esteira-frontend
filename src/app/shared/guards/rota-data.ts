/**
 * Metadado de rota (`data`) lido por dois consumidores: o `perfilGuard` e o menu do shell.
 * O mesmo dado serve aos dois, então item de menu e rota nunca divergem.
 */
export interface RotaData {
  /** Presente = a rota aparece no menu. */
  menu?: { rotulo: string; icone: string };
  /** Perfis (de `realm_access.roles`, via `/usuarios/me`) que podem abrir a rota; ausente ou vazio = qualquer usuário logado. */
  perfis?: string[];
  /** Código da Fatia (`A1`): com o flag `Features:<código>` desligado a rota não existe e o item some do menu. */
  feature?: string;
  /** Flag de uma parte da tela (P2: botões e seção de Ações do Painel); desligada, a rota continua e só a parte some. */
  featureAcoes?: string;
}

/** Regra única de perfis, usada pelo `perfilGuard` e pelo menu: sem exigência libera; com exigência, vale ter um deles. */
export function perfilPermite(exigidos: string[] | undefined, doUsuario: readonly string[]): boolean {
  return !exigidos?.length || doUsuario.some((perfil) => exigidos.includes(perfil));
}
