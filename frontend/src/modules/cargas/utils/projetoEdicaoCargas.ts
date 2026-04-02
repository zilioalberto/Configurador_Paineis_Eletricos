import type { Projeto } from '@/modules/projetos/types/projeto'

export function projetoPermiteEdicaoCargas(projeto: Projeto | undefined | null): boolean {
  return projeto != null && projeto.status !== 'FINALIZADO'
}

export function filtrarProjetosComEdicaoCargas(projetos: Projeto[]): Projeto[] {
  return projetos.filter((p) => p.status !== 'FINALIZADO')
}
