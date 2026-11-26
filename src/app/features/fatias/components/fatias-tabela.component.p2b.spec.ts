import { TestBed } from '@angular/core/testing';
import type { AcoesDaLinha } from '../fatias.service';
import type { FatiaDoPainel } from '../fatias.tipos';
import { FatiasTabelaComponent } from './fatias-tabela.component';

const fatia: FatiaDoPainel = {
  aplicacaoId: 'a1', aplicacao: 'Valuto', sigla: 'VLT', codigo: 'P2b', titulo: 'Título', estado: 'em-revisao', progresso: null,
  emCorrecao: false, formatoAnterior: false, risco: 'alto', status: 'aprovada', statusReconhecido: true, repositorios: ['api'], specDisponivel: true,
};
const bloqueada = { pode: false, motivo: 'decisao-em-andamento' };
const acoes: AcoesDaLinha = { abrirReview: bloqueada, aprovar: bloqueada, reprovar: bloqueada, review: { estado: 'nenhum', link: null }, decisao: 'falhou' };

describe('[P2b] FatiasTabelaComponent: decisão falhou', () => {
  it('a linha diz "falhou — reexecutar na gaveta" e o clique no texto abre a gaveta', () => {
    const fixture = TestBed.createComponent(FatiasTabelaComponent);
    fixture.componentRef.setInput('itens', [fatia]);
    fixture.componentRef.setInput('acoes', new Map([['a1P2b', acoes]]));
    const abertas: string[] = [];
    fixture.componentInstance.abrir.subscribe((f) => abertas.push(f.codigo));
    fixture.detectChanges();

    const estado = fixture.nativeElement.querySelector('[data-testid="decisao-estado"]') as HTMLElement;
    expect(estado.textContent).toContain('falhou — reexecutar na gaveta');
    estado.click();
    expect(abertas).toEqual(['P2b']);
  });
});
