import type { CategoriaProdutoNome } from '../types/categoria'
import {
  acabamentoPlacaPainelOptions,
  corPainelOptions,
  corManoplaOptions,
  materialTrilhoDINOptions,
  modoMontagemOptions,
  modoMontagemPlacaPortaOptions,
  modoMontagemTrilhoPlacaOptions,
  tensaoBobinaOptions,
  tipoBorneCatalogoOptions,
  tipoCorrenteBobinaOptions,
  tipoFixacaoSeccionadoraOptions,
  tipoAnalogicoPlcOptions,
  tensaoAlimentacaoClimatizacaoOptions,
  tensaoAlimentacaoIhmOptions,
  tipoTrilhoDINOptions,
} from './catalogoChoiceOptions'
import categoriaFieldChoiceOptionsJson from '../data/categoriaFieldChoiceOptions.json'

export type SelectOption = { readonly value: string | number; readonly label: string }

/** Lista padrão de graus IP para formulários de especificação (catálogo). */
export const grauProtecaoIpSelectOptions: readonly SelectOption[] = [
  { value: 'IP55', label: 'IP55' },
  { value: 'IP65', label: 'IP65' },
  { value: 'IP66', label: 'IP66' },
  { value: 'IP67', label: 'IP67' },
  { value: 'IP69K', label: 'IP69K' },
]

const MAP = new Map<string, readonly SelectOption[]>()
const AUTO_MAP = categoriaFieldChoiceOptionsJson as Partial<
  Record<CategoriaProdutoNome, Record<string, readonly SelectOption[]>>
>

function reg(categoria: CategoriaProdutoNome, campo: string, opts: readonly SelectOption[]) {
  MAP.set(`${categoria}.${campo}`, opts)
}

reg('CONTATORA', 'modo_montagem', modoMontagemOptions)
reg('CONTATORA', 'tensao_bobina_v', tensaoBobinaOptions)
reg('CONTATORA', 'tipo_corrente_bobina', tipoCorrenteBobinaOptions)

reg('DISJUNTOR_MOTOR', 'modo_montagem', modoMontagemOptions)
reg('BOTAO', 'modo_montagem', [{ value: 'PORTA', label: 'Porta' }])
reg('BOTAO', 'tensao_iluminacao_v', [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
])
reg('BOTAO', 'diametro_furo_mm', [
  { value: 22, label: '22 mm' },
  { value: 30, label: '30 mm' },
])
reg('BOTAO', 'grau_protecao_ip', grauProtecaoIpSelectOptions)
reg('SINALIZADOR', 'tensao_comando_v', [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
])
reg('RELE_INTERFACE', 'tensao_bobina_v', [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
])
reg('RELE_INTERFACE', 'quantidade_contatos', [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
])
reg('CHAVE_SELETORA', 'numero_posicoes', [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
])
reg('CHAVE_SELETORA', 'tipo_acionamento', [
  { value: 'RETENTIVO', label: 'Retentivo' },
  { value: 'MOMENTANEO', label: 'Momentâneo' },
])
reg('CHAVE_SELETORA', 'modo_montagem', [{ value: 'PORTA', label: 'Porta' }])
reg('CHAVE_SELETORA', 'diametro_furo_mm', [
  { value: 22, label: '22 mm' },
  { value: 30, label: '30 mm' },
])
reg('CHAVE_SELETORA', 'grau_protecao_ip', grauProtecaoIpSelectOptions)
reg('CHAVE_SELETORA', 'tensao_iluminacao_v', [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
])
reg(
  'RELE_SOBRECARGA',
  'modo_montagem',
  [
    { value: 'TRILHO_DIN', label: 'Trilho DIN' },
    { value: 'ACOPLADO_CONTATOR', label: 'Acoplado ao contator' },
  ]
)
reg(
  'RELE_ESTADO_SOLIDO',
  'modo_montagem',
  modoMontagemOptions.filter(
    (opt) => opt.value === 'TRILHO_DIN' || opt.value === 'PLACA'
  )
)
reg('RELE_ESTADO_SOLIDO', 'tensao_ventilacao_v', [
  { value: 24, label: '24 VCC' },
  { value: 220, label: '220 VCA' },
])
reg('MINIDISJUNTOR', 'tensao_nominal_v', [
  { value: 127, label: '127V' },
  { value: 220, label: '220V' },
  { value: 380, label: '380V' },
])
reg('DISJUNTOR_CAIXA_MOLDADA', 'modo_montagem', [
  { value: 'PLACA', label: 'Placa de montagem' },
])
reg('DISJUNTOR_CAIXA_MOLDADA', 'configuracao_disparador', [
  {
    value: 'TERMOMAGNETICO_IR_II_FIXOS',
    label: 'Com disparador termomagnético, sobrecarga e curto-circuito fixos',
  },
  {
    value: 'TERMOMAGNETICO_LI_IR_II_FIXOS',
    label: 'Com disparador termomagnético, proteção LI, sobrecarga e curto-circuito fixos',
  },
  {
    value: 'TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO',
    label:
      'Com disparador termomagnético, proteção LI, sobrecarga ajustável e curto-circuito fixo',
  },
  {
    value: 'TERMOMAGNETICO_LI_II_AJUSTAVEL',
    label: 'Com disparador termomagnético, proteção LI e curto-circuito ajustável',
  },
])

reg('SECCIONADORA', 'tipo_montagem', modoMontagemOptions)
reg('SECCIONADORA', 'tipo_fixacao', tipoFixacaoSeccionadoraOptions)
reg('SECCIONADORA', 'cor_manopla', corManoplaOptions)

reg('TRILHO_DIN', 'tipo_trilho', tipoTrilhoDINOptions)
reg('TRILHO_DIN', 'material', materialTrilhoDINOptions)

reg('TEMPORIZADOR', 'tensao_alimentacao_v', [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
])
reg('TEMPORIZADOR', 'tipo_montagem', [{ value: 'TRILHO_DIN', label: 'Trilho DIN' }])
reg('CONTROLADOR_TEMPERATURA', 'tensao_alimentacao_v', [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
])

reg('PLC', 'tipo_entradas_analogicas', tipoAnalogicoPlcOptions)
reg('PLC', 'tipo_saidas_analogicas', tipoAnalogicoPlcOptions)
reg('EXPANSAO_PLC', 'tipo_sinal_analogico', tipoAnalogicoPlcOptions)

reg('IHM', 'tensao_alimentacao_v', tensaoAlimentacaoIhmOptions)
reg('IHM', 'modo_montagem', [{ value: 'PORTA', label: 'Porta' }])
reg('CLIMATIZACAO', 'tensao_alimentacao_v', tensaoAlimentacaoClimatizacaoOptions)
reg('CLIMATIZACAO', 'modo_montagem', modoMontagemOptions)

reg('MODULO_COMUNICACAO', 'modo_montagem', modoMontagemTrilhoPlacaOptions)
reg('GATEWAY', 'modo_montagem', modoMontagemTrilhoPlacaOptions)
reg('FONTE_CHAVEADA', 'modo_montagem', modoMontagemTrilhoPlacaOptions)
reg('BORNE', 'tipo_borne', tipoBorneCatalogoOptions)
reg('BORNE', 'modo_montagem', modoMontagemTrilhoPlacaOptions)
reg('CANALETA', 'modo_montagem', modoMontagemPlacaPortaOptions)
reg('PAINEL', 'placa_acabamento', acabamentoPlacaPainelOptions)
reg('PAINEL', 'cor', corPainelOptions)

/** Campos inteiros que usam a lista de tensões da API. */
const TENSAO_FIELDS = new Set([
  'tensao_bobina_v',
  'tensao_nominal_v',
  'tensao_alimentacao_v',
  'tensao_entrada_v',
  'tensao_saida_v',
  'tensao_comando_v',
  'tensao_carga_v',
  'tensao_controle_v',
  'tensao_iluminacao_v',
])

export function selectOptionsParaCampo(
  categoria: CategoriaProdutoNome,
  campo: string
): readonly SelectOption[] | undefined {
  // Regras específicas devem prevalecer sobre o AUTO_MAP gerado.
  const porCampo = MAP.get(`${categoria}.${campo}`)
  if (porCampo?.length) return porCampo

  // Antes do AUTO_MAP: evita listas antigas (6 valores) em JSON gerado.
  if (campo === 'modo_montagem') return modoMontagemOptions

  const auto = AUTO_MAP[categoria]?.[campo]
  if (auto?.length) return auto

  if (campo === 'grau_protecao_ip' || campo === 'grau_protecao_ip_frontal') {
    return grauProtecaoIpSelectOptions
  }

  if (TENSAO_FIELDS.has(campo)) return tensaoBobinaOptions

  if (campo.startsWith('tipo_corrente')) return tipoCorrenteBobinaOptions

  return undefined
}
