import type { Routes } from '@angular/router';
import { perfilPermite, type RotaData } from '../shared/guards/rota-data';

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

    // Rota restrita esconde também os filhos: quem não abre o pai não vê o filho (o guard do pai o barraria).
    if (!perfilPermite(data.perfis, perfisDoUsuario)) return [];

    const proprio: ItemMenu[] = data.menu ? [{ ...data.menu, caminho }] : [];
    const filhos = rota.children ? itensDeMenu(rota.children, perfisDoUsuario, caminho === '/' ? '' : caminho) : [];
    return [...proprio, ...filhos];
  });
}
