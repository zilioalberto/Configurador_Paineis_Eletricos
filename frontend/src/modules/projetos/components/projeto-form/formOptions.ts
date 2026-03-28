import type {
  ProjetoFormData,
  StatusProjeto,
  TipoClimatizacaoPainel,
  TipoConexaoAlimentacao,
  TipoCorrente,
  TipoPainel,
  TipoSeccionamento,
} from '../../types/projeto'

export type FormOption<T extends string | number> = {
  value: T
  label: string
}

export const statusOptions: FormOption<StatusProjeto>[] = [
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'FINALIZADO', label: 'Finalizado' },
]

export const tipoPainelOptions: FormOption<TipoPainel>[] = [
  { value: 'AUTOMACAO', label: 'Automação' },
  { value: 'DISTRIBUICAO', label: 'Distribuição' },
]

export const tipoCorrenteOptions: FormOption<TipoCorrente>[] = [
  { value: 'CA', label: 'Corrente alternada (CA)' },
  { value: 'CC', label: 'Corrente contínua (CC)' },
]

export const numeroFasesOptions: FormOption<number>[] = [
  { value: 1, label: 'Monofásico' },
  { value: 2, label: 'Bifásico' },
  { value: 3, label: 'Trifásico' },
]

export const frequenciaOptions: FormOption<number>[] = [
  { value: 50, label: '50 Hz' },
  { value: 60, label: '60 Hz' },
]

export const tipoConexaoOptions: FormOption<TipoConexaoAlimentacao>[] = [
  { value: 'BARRAMENTO', label: 'Barramento' },
  { value: 'BORNE', label: 'Borne' },
  { value: 'TOMADA', label: 'Tomada' },
  { value: 'DIRETO', label: 'Direto' },
  { value: 'OUTRO', label: 'Outro' },
]

export const tipoClimatizacaoOptions: FormOption<TipoClimatizacaoPainel>[] = [
  { value: 'VENTILADOR', label: 'Ventilador' },
  { value: 'EXAUSTOR', label: 'Exaustor' },
  { value: 'AR_CONDICIONADO', label: 'Ar-condicionado' },
  { value: 'OUTRO', label: 'Outro' },
]

export const tipoSeccionamentoOptions: FormOption<TipoSeccionamento>[] = [
  { value: 'NENHUM', label: 'Sem seccionamento' },
  { value: 'SECCIONADORA', label: 'Seccionadora' },
  { value: 'DISJUNTOR_CAIXA_MOLDADA', label: 'Disjuntor caixa moldada' },
]

export const projetoFormInitialState: ProjetoFormData = {
  codigo: '',
  nome: '',
  descricao: '',
  cliente: '',

  status: 'EM_ANDAMENTO',
  tipo_painel: 'AUTOMACAO',

  tipo_corrente: 'CA',
  tensao_nominal: 380,
  numero_fases: 3,
  frequencia: 60,

  possui_neutro: true,
  possui_terra: true,

  tipo_conexao_alimentacao_potencia: 'BORNE',
  tipo_conexao_alimentacao_neutro: 'BORNE',
  tipo_conexao_alimentacao_terra: 'BORNE',

  tipo_corrente_comando: 'CC',
  tensao_comando: 24,

  possui_plc: false,
  possui_ihm: false,
  possui_switches: false,
  possui_plaqueta_identificacao: false,
  possui_faixa_identificacao: false,
  possui_adesivo_alerta: false,
  possui_adesivos_tensao: false,

  possui_climatizacao: false,
  tipo_climatizacao: null,

  fator_demanda: '1.00',

  possui_seccionamento: false,
  tipo_seccionamento: null,
}
