/** Erro de negócio da decisão como o `FatiasService` o devolve (`codigo` e `mensagem` vêm da API). */
export interface ErroDaDecisao {
  codigo: string | null;
  mensagem: string | null;
}

/** MR que o Aprovar vai mergear; `iid` e `titulo` só existem quando a gaveta da Fatia já foi lida. */
export interface MrParaAprovar {
  repositorio: string;
  iid?: number | string;
  titulo?: string;
}
