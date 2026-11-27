import { falhaTraduzida, nomeDaEtapa, rotuloDaEntrega, rotuloDaEtapa, rotuloDoTempoReal } from './entregas.apresentacao';

describe('[E1b] entregas.apresentacao', () => {
  it('cada estado de Etapa tem texto e ícone próprios (nunca só cor)', () => {
    const estados = ['nao-iniciado', 'executando', 'aguardando-aprovacao', 'concluido', 'pulada', 'falhou'];
    const rotulos = estados.map((e) => rotuloDaEtapa(e));
    expect(rotulos.map((r) => r.texto)).toEqual(['Não iniciado', 'Executando', 'Aguardando aprovação', 'Concluído', 'Pulada', 'Falhou']);
    expect(new Set(rotulos.map((r) => r.icone)).size).toBe(6);
    expect(rotuloDaEtapa('falhou').tom).toBe('vermelho');
  });

  it('estado desconhecido aparece como texto cru, neutro, sem quebrar', () => {
    expect(rotuloDaEtapa('em-rollback')).toMatchObject({ texto: 'em-rollback', tom: 'neutro' });
    expect(rotuloDaEntrega('x')).toMatchObject({ texto: 'x', tom: 'neutro' });
  });

  it('estados da Entrega', () => {
    expect(rotuloDaEntrega('bloqueada-ou-falha').texto).toBe('Bloqueada ou com falha');
    expect(rotuloDaEntrega('aguardando-aprovacao').texto).toBe('Aguardando aprovação');
    expect(rotuloDaEntrega('em-andamento').texto).toBe('Em andamento');
  });

  it('nome da Etapa', () => {
    expect(['abertura', 'qa', 'hml', 'prd'].map(nomeDaEtapa)).toEqual(['Abertura', 'QA', 'HML', 'PRD']);
  });

  it('traduz codigoFalha da pipeline e mostra o resto como veio', () => {
    expect(falhaTraduzida('pipeline.falhou')).toBe('A pipeline falhou.');
    expect(falhaTraduzida('pipeline.cancelada')).toBe('A pipeline foi cancelada.');
    expect(falhaTraduzida('outra.coisa')).toBe('Falha: outra.coisa');
  });

  it('rótulo do tempo real', () => {
    expect(rotuloDoTempoReal('ao-vivo')).toBe('Ao vivo');
    expect(rotuloDoTempoReal('reconectando')).toBe('Reconectando…');
    expect(rotuloDoTempoReal('consulta')).toBe('Atualização a cada 30 s');
    expect(rotuloDoTempoReal(null)).toBeNull();
  });
});
