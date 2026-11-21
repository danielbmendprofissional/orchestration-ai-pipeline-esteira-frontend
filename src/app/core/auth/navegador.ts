import { InjectionToken } from '@angular/core';

/** Navegação de página inteira (login e logout são do BFF, não do roteador). Injetável para os testes não trocarem a página. */
export interface Navegador {
  irPara(url: string): void;
  /** Caminho + query + hash da página atual, usado como `returnUrl`. */
  caminhoAtual(): string;
}

export const NAVEGADOR = new InjectionToken<Navegador>('NAVEGADOR', {
  providedIn: 'root',
  factory: () => ({
    irPara: (url) => window.location.assign(url),
    caminhoAtual: () => window.location.pathname + window.location.search + window.location.hash,
  }),
});
