/** Regras de edição: cargas só podem ser alteradas em projetos não finalizados. */

import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'

export function projetoPermiteEdicaoCargas(projeto: Projeto | undefined | null): boolean {
  return projeto != null && projeto.status !== 'FINALIZADO'
}

export function filtrarProjetosComEdicaoCargas(projetos: Projeto[]): Projeto[] {
  return projetos.filter((p) => p.status !== 'FINALIZADO')
}
