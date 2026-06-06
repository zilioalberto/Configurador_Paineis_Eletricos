import { listarParceiros } from '@/modules/cadastros/services/cadastrosApi'
import type { ParceiroComercialDto } from '@/modules/cadastros/types/cadastros'

/** Clientes ativos do cadastro comercial (parceiros marcados como cliente). */
export async function listarClientesProjeto(): Promise<ParceiroComercialDto[]> {
  return listarParceiros({ tipo: 'cliente', ativo: '1' })
}
