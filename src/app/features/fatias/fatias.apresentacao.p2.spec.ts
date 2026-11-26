import { rotuloDaAcao, rotuloDaDecisao, rotuloDoReview, textoDoMotivo } from './fatias.apresentacao';

describe('[P2] apresentação da decisão', () => {
  it('traduz cada motivo da API e devolve o código quando não conhece', () => {
    for (const m of ['papel', 'sem-mr-aberta', 'ci-nao-verde', 'decisao-em-andamento', 'review-ja-pedido']) {
      expect(textoDoMotivo(m)).not.toBe(m);
    }
    expect(textoDoMotivo('novo-motivo')).toBe('novo-motivo');
    expect(textoDoMotivo(null)).toBeNull();
  });

  it('a decisão em andamento vira o texto da linha', () => {
    expect(rotuloDaDecisao('nenhuma')).toBeNull();
    expect(rotuloDaDecisao(undefined)).toBeNull();
    expect(rotuloDaDecisao('aprovando')?.texto).toBe('aprovação pedida');
    expect(rotuloDaDecisao('reprovando')?.texto).toBe('reprovação pedida');
    expect(rotuloDaDecisao('falhou')?.texto).toBe('falhou — reexecutar na gaveta');
  });

  it('o review vira texto, e só "aberto" tem link seguro', () => {
    expect(rotuloDoReview({ estado: 'nenhum', link: null })).toBeNull();
    expect(rotuloDoReview({ estado: 'pedido', link: null })?.texto).toBe('review pedido…');
    expect(rotuloDoReview({ estado: 'aberto', link: 'https://r.exemplo/p2' })).toEqual(
      expect.objectContaining({ texto: 'review aberto', link: 'https://r.exemplo/p2' }),
    );
    expect(rotuloDoReview({ estado: 'aberto', link: 'javascript:alert(1)' })?.link).toBeNull();
  });

  it('ação do bot tem ícone e texto para tipo e estado, nunca só cor', () => {
    expect(rotuloDaAcao({ tipo: 'abrir-review', estado: 'confirmada' })).toEqual(
      expect.objectContaining({ tipo: 'Abrir review', estado: 'confirmada' }),
    );
    expect(rotuloDaAcao({ tipo: 'aprovar', estado: 'falhou' }).icone).toBeTruthy();
    expect(rotuloDaAcao({ tipo: 'x', estado: 'y' })).toEqual(expect.objectContaining({ tipo: 'x', estado: 'y' }));
  });
});
