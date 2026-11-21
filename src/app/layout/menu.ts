import type { Routes } from '@angular/router';
import type { RotaData } from '../shared/guards/rota-data';

export interface ItemMenu {
  rotulo: string;
  icone: string;
  caminho: string;
}

/**
 * Monta o menu dos metadados das rotas (`data.menu`). O mesmo `data.perfis` que o `perfilGuard` confere
 * filtra o item: quem não abre a rota também não a vê no menu. Feature nova só declara a rota.
 */
export function itensDeMenu(rotas: Routes, perfisDoUsuario: readonly string[], prefixo = ''): ItemMenu[] {
  return rotas.flatMap((rota) => {
    const segmento = rota.path ?? '';
    const caminho = segmento ? `${prefixo}/${segmento}` : prefixo || '/';
    const data = (rota.data ?? {}) as RotaData;

    const proprio: ItemMenu[] = data.menu && podeVer(data.perfis, perfisDoUsuario) ? [{ ...data.menu, caminho }] : [];
    const filhos = rota.children ? itensDeMenu(rota.children, perfisDoUsuario, caminho === '/' ? '' : caminho) : [];
    return [...proprio, ...filhos];
  });
}

function podeVer(exigidos: string[] | undefined, doUsuario: readonly string[]): boolean {
  return !exigidos?.length || doUsuario.some((perfil) => exigidos.includes(perfil));
}
