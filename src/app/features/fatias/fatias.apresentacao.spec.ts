import { horaDosDados, janelaDePaginas, linkSeguro, rotuloDoEstado, rotuloDoProjeto, rotuloDoPipeline } from './fatias.apresentacao';

describe('[P1] apresentação do Painel de Fatias', () => {
  describe('linkSeguro', () => {
    it('aceita só http e https vindos da API', () => {
      expect(linkSeguro('https://gitlab.exemplo.local/x/-/issues/1')).toBe('https://gitlab.exemplo.local/x/-/issues/1');
      expect(linkSeguro('http://gitlab.exemplo.local/x')).toBe('http://gitlab.exemplo.local/x');
    });

    it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', '//evil.example/x', '/relativo', 'gitlab.exemplo.local', '', '   '])(
      'ignora %j',
      (valor) => expect(linkSeguro(valor)).toBeNull(),
    );

    it('ignora nulo e indefinido', () => {
      expect(linkSeguro(null)).toBeNull();
      expect(linkSeguro(undefined)).toBeNull();
    });
  });

  describe('janelaDePaginas', () => {
    it('mostra tudo quando cabe', () => {
      expect(janelaDePaginas(2, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('abre reticências nas duas pontas: 1 2 … 5 6 7 … 59 60', () => {
      expect(janelaDePaginas(6, 60)).toEqual([1, 2, '…', 5, 6, 7, '…', 59, 60]);
    });

    it('não põe reticência onde falta só uma página', () => {
      expect(janelaDePaginas(3, 8)).toEqual([1, 2, 3, 4, '…', 7, 8]);
      expect(janelaDePaginas(1, 60)).toEqual([1, 2, '…', 59, 60]);
    });

    it('uma página só devolve a própria', () => {
      expect(janelaDePaginas(1, 1)).toEqual([1]);
    });
  });

  describe('horaDosDados', () => {
    it('devolve HH:MM no fuso do navegador', () => {
      const iso = '2026-11-22T14:05:00Z';
      const d = new Date(iso);
      const esperado = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      expect(horaDosDados(iso)).toBe(esperado);
    });

    it('sem instante ou com instante inválido, devolve nulo', () => {
      expect(horaDosDados(null)).toBeNull();
      expect(horaDosDados('não é data')).toBeNull();
    });
  });

  describe('rótulos', () => {
    it('estado: ícone e texto para cada estado da P1; "em correção" troca o texto de Em revisão', () => {
      expect(rotuloDoEstado('planejada', false)).toMatchObject({ texto: 'Planejada', tom: 'neutro' });
      expect(rotuloDoEstado('com-spec', false)).toMatchObject({ texto: 'Com spec', tom: 'neutro' });
      expect(rotuloDoEstado('em-execucao', false)).toMatchObject({ texto: 'Em execução', tom: 'azul' });
      expect(rotuloDoEstado('em-revisao', false)).toMatchObject({ texto: 'Em revisão', tom: 'azul' });
      expect(rotuloDoEstado('em-revisao', true)).toMatchObject({ texto: 'Em correção', tom: 'azul' });
      expect(rotuloDoEstado('pronta-para-entrega', false)).toMatchObject({ texto: 'Pronta para Entrega', tom: 'ambar' });
      for (const e of ['planejada', 'com-spec', 'em-execucao', 'em-revisao', 'pronta-para-entrega'])
        expect(rotuloDoEstado(e, false).icone).toMatch(/^lucide/);
    });

    it('estado desconhecido aparece como veio, em neutro', () => {
      expect(rotuloDoEstado('algo-novo', false)).toMatchObject({ texto: 'algo-novo', tom: 'neutro' });
    });

    it('projeto', () => {
      expect(rotuloDoProjeto('api')).toBe('API');
      expect(rotuloDoProjeto('frontend')).toBe('Front');
      expect(rotuloDoProjeto('outro')).toBe('outro');
    });

    it('pipeline: texto sempre, com ícone', () => {
      expect(rotuloDoPipeline('success')).toMatchObject({ texto: 'pipeline verde' });
      expect(rotuloDoPipeline('failed')).toMatchObject({ texto: 'pipeline falhou' });
      expect(rotuloDoPipeline('running')).toMatchObject({ texto: 'pipeline rodando' });
      expect(rotuloDoPipeline(null)).toMatchObject({ texto: 'sem pipeline' });
      expect(rotuloDoPipeline('xyz')).toMatchObject({ texto: 'pipeline xyz' });
    });
  });
});
