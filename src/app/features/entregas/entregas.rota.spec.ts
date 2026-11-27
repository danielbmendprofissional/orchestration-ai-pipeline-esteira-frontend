import { routes } from '../../app.routes';
import { featureGuard } from '../../shared/guards/feature.guard';
import { TIPOS_DE_EVENTO } from '../../core/tempo-real/tempo-real.tipos';
import type { RotaData } from '../../shared/guards/rota-data';

describe('[E1b] rota /entregas/:id e tipo de evento', () => {
  const filhas = routes[0].children ?? [];
  const entregas = filhas.find((r) => r.path === 'entregas/:id');

  it('existe atrás do featureGuard com Features:E1b (flag ausente = a rota nem casa) e sem item de menu', () => {
    expect(entregas).toBeDefined();
    expect(entregas?.canMatch).toContain(featureGuard);
    expect((entregas?.data as RotaData).feature).toBe('E1b');
    expect((entregas?.data as RotaData).menu).toBeUndefined();
  });

  it('fica antes do coringa para poder casar', () => {
    const i = filhas.indexOf(entregas!);
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(filhas.findIndex((r) => r.path === '**'));
  });

  it('entrega.atualizada é um tipo de evento do SSE', () => {
    expect(TIPOS_DE_EVENTO).toContain('entrega.atualizada');
  });
});
