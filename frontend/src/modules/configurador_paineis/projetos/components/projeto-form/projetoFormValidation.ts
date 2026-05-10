import { ApiError } from '@/services/http/ApiError'
import type { ProjetoFormData } from '../../types/projeto'

/** Rótulos para mensagens na UI (evita mostrar nomes de campo da API). */
export const ROTULOS_CAMPOS_PROJETO: Record<string, string> = {
  familia_plc: 'Família do PLC',
  tipo_climatizacao: 'Tipo de climatização',
  tipo_seccionamento: 'Tipo de seccionamento',
  tipo_conexao_alimentacao_neutro: 'Conexão do neutro',
  tipo_conexao_alimentacao_terra: 'Conexão do terra',
  tipo_conexao_alimentacao_potencia: 'Conexão da alimentação de potência',
  tensao_nominal: 'Tensão nominal',
  numero_fases: 'Número de fases',
  frequencia: 'Frequência',
  codigo: 'Código',
  nome: 'Nome',
  cliente: 'Cliente',
  fator_demanda: 'Fator de demanda',
  degraus_margem_bitola_condutores: 'Margem de bitola (condutores)',
}

function textoVazio(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  return false
}

function primeiraMensagemLista(valor: unknown): string {
  if (typeof valor === 'string') return valor.trim()
  if (Array.isArray(valor)) {
    for (const item of valor) {
      if (typeof item === 'string' && item.trim()) return item.trim()
    }
  }
  return ''
}

/**
 * Validação alinhada às regras de `Projeto.clean()` no backend (campos condicionais a checkboxes).
 */
export function validarProjetoFormulario(data: ProjetoFormData): Record<string, string> {
  const erros: Record<string, string> = {}

  if (textoVazio(data.tipo_conexao_alimentacao_potencia)) {
    erros.tipo_conexao_alimentacao_potencia =
      'Selecione o tipo de conexão da alimentação de potência.'
  }

  if (data.possui_neutro && !data.tipo_conexao_alimentacao_neutro) {
    erros.tipo_conexao_alimentacao_neutro =
      'Selecione o tipo de conexão do neutro ou desmarque «Possui neutro».'
  }

  if (data.possui_terra && !data.tipo_conexao_alimentacao_terra) {
    erros.tipo_conexao_alimentacao_terra =
      'Selecione o tipo de conexão do terra ou desmarque «Possui terra».'
  }

  if (data.possui_climatizacao && !data.tipo_climatizacao) {
    erros.tipo_climatizacao =
      'Selecione o tipo de climatização (ventilador, ar-condicionado, etc.) ou desmarque «Possui climatização».'
  }

  if (data.possui_plc && textoVazio(data.familia_plc)) {
    erros.familia_plc = 'Selecione a família do PLC ou desmarque «Possui PLC».'
  }

  if (data.possui_seccionamento) {
    if (!data.tipo_seccionamento || data.tipo_seccionamento === 'NENHUM') {
      erros.tipo_seccionamento =
        'Selecione o tipo de seccionamento ou desmarque «Possui seccionamento».'
    }
  }

  return erros
}

/**
 * Extrai erros por campo a partir do corpo 400 da API (DRF / Django ValidationError).
 */
export function mapearErrosValidacaoApi(error: unknown): Record<string, string> {
  const body = ApiError.isApiError(error) ? error.details : null
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const [campo, valor] of Object.entries(body as Record<string, unknown>)) {
    if (campo === 'detail' || campo === 'non_field_errors') continue
    const msg = primeiraMensagemLista(valor)
    if (msg) out[campo] = msg
  }
  return out
}

export function haErrosDeCampoNaRespostaApi(error: unknown): boolean {
  return Object.keys(mapearErrosValidacaoApi(error)).length > 0
}
