import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

/** Único ponto que fala com o toast do spartan (sonner): o resto do app depende deste serviço, não da biblioteca. */
@Injectable({ providedIn: 'root' })
export class Notificador {
  erro(mensagem: string): void {
    toast.error(mensagem);
  }
}
