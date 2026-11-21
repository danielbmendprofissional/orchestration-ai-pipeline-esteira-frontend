import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Feature flags por Ambiente (`docs/agents/padrao-frontend.md`, "Feature flags"): o app lê `/features.json`
 * no boot. Ausente conta como desligado: arquivo faltando, falha, corpo que não é objeto, `{}` e qualquer
 * valor diferente de `true` literal. Nunca existe default ligado.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly http = inject(HttpClient);
  private readonly ligados = signal<ReadonlySet<string>>(new Set());

  /** Nunca rejeita: sem flags, o app sobe com tudo desligado. */
  async carregar(): Promise<void> {
    try {
      const corpo = await firstValueFrom(this.http.get<unknown>('/features.json'));
      this.ligados.set(flagsLigados(corpo));
    } catch {
      this.ligados.set(new Set());
    }
  }

  isEnabled(codigo: string): boolean {
    return this.ligados().has(codigo);
  }
}

function flagsLigados(corpo: unknown): ReadonlySet<string> {
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) return new Set();
  return new Set(Object.entries(corpo).filter(([, valor]) => valor === true).map(([codigo]) => codigo));
}
