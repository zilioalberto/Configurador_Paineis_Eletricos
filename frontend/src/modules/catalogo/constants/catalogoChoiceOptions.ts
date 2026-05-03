/** Opções alinhadas a `core.choices` do backend (valores da API). */

export const unidadeMedidaProdutoOptions = [
  { value: 'UN', label: 'Unidade' },
  { value: 'MT', label: 'Metro' },
  { value: 'CJ', label: 'Conjunto' },
] as const

export const tensaoBobinaOptions = [
  { value: 12, label: '12 V' },
  { value: 24, label: '24 V' },
  { value: 48, label: '48 V' },
  { value: 90, label: '90 V' },
  { value: 110, label: '110 V' },
  { value: 127, label: '127 V' },
  { value: 220, label: '220 V' },
  { value: 380, label: '380 V' },
  { value: 440, label: '440 V' },
] as const

export const tipoCorrenteBobinaOptions = [
  { value: 'CA', label: 'Corrente alternada' },
  { value: 'CC', label: 'Corrente contínua' },
] as const

/** Modos de montagem do catálogo (exc. relé de sobrecarga: ver registo em specSelectRegistry). */
export const modoMontagemOptions = [
  { value: 'TRILHO_DIN', label: 'Trilho DIN' },
  { value: 'PLACA', label: 'Placa de montagem' },
  { value: 'PORTA', label: 'Porta' },
] as const

/** Módulo de comunicação (e casos equivalentes): só trilho ou placa. */
export const modoMontagemTrilhoPlacaOptions = [
  { value: 'TRILHO_DIN', label: 'Trilho DIN' },
  { value: 'PLACA', label: 'Placa de montagem' },
] as const

/** Canaleta: placa ou porta. */
export const modoMontagemPlacaPortaOptions = [
  { value: 'PLACA', label: 'Placa de montagem' },
  { value: 'PORTA', label: 'Porta' },
] as const

/** `TipoBorneChoices` — catálogo de bornes. */
export const tipoBorneCatalogoOptions = [
  { value: 'PASSAGEM', label: 'Passagem' },
  { value: 'TERRA', label: 'Terra' },
  { value: 'FUSIVEL', label: 'Fusível' },
  { value: 'SECCIONAVEL', label: 'Seccionável' },
  { value: 'SENSOR', label: 'Sensor' },
  { value: 'AFERICAO', label: 'Borne de aferição' },
] as const

/** IHM (e equivalente a tensão botão/chave): 24, 110, 220 V. */
export const tensaoAlimentacaoIhmOptions = [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
] as const

/** Climatização: 24, 110, 220 ou 380 V. */
export const tensaoAlimentacaoClimatizacaoOptions = [
  { value: 24, label: '24 V' },
  { value: 110, label: '110 V' },
  { value: 220, label: '220 V' },
  { value: 380, label: '380 V' },
] as const

/** `TipoAnalogicoPlcChoices` — entradas/saídas analógicas do PLC. */
export const tipoAnalogicoPlcOptions = [
  { value: 'MA_0_20', label: '0–20 mA' },
  { value: 'MA_4_20', label: '4–20 mA' },
  { value: 'V_0_10', label: '0–10 V' },
  { value: 'V_PM_10', label: '±10 V' },
  { value: 'V_0_5', label: '0–5 V' },
  { value: 'CONFIGURAVEL_SOFTWARE', label: 'Configurável via software' },
] as const

export const tipoFixacaoSeccionadoraOptions = [
  {
    value: 'FURO_CENTRAL_M22_5',
    label: 'Fixação por furo central M22,5',
  },
  { value: 'QUATRO_FUROS', label: 'Fixação por quatro furos' },
] as const

export const corManoplaOptions = [
  { value: 'PUNHO_PRETO', label: 'Punho preto' },
  { value: 'PUNHO_VERMELHO', label: 'Punho vermelho' },
] as const

/** Mesmos valores numéricos que `TensaoChoices` no backend (inteiros). */
export const tensaoAlimentacaoOptions = tensaoBobinaOptions

/** `TipoTrilhoDINChoices` */
export const tipoTrilhoDINOptions = [
  { value: 'TS35', label: 'TS 35' },
  { value: 'TS32', label: 'TS 32' },
  { value: 'TS15', label: 'TS 15' },
  { value: 'OUTRO', label: 'Outro' },
] as const

/** `FormatoTrilhoDINChoices` */
export const formatoTrilhoDINOptions = [
  { value: 'OMEGA', label: 'Ômega' },
  { value: 'C', label: 'Perfil C' },
  { value: 'G', label: 'Perfil G' },
  { value: 'OUTRO', label: 'Outro' },
] as const

/** `MaterialTrilhoDINChoices` */
export const materialTrilhoDINOptions = [
  { value: 'ACO_GALVANIZADO', label: 'Aço galvanizado' },
  { value: 'ACO_INOX', label: 'Aço inox' },
  { value: 'ALUMINIO', label: 'Alumínio' },
  { value: 'OUTRO', label: 'Outro' },
] as const

/** Acabamento da placa de montagem no painel (`AcabamentoPlacaPainelChoices`). */
export const acabamentoPlacaPainelOptions = [
  { value: 'GALVANIZADA', label: 'Galvanizada' },
  { value: 'PINTURA_LARANJA', label: 'Pintura laranja' },
] as const

/** Cor do invólucro do painel (`CorPainelChoices`). */
export const corPainelOptions = [
  { value: 'RAL7035', label: 'RAL 7035 (cinza claro)' },
  { value: 'RAL7032', label: 'RAL 7032 (bege)' },
] as const

/** `TipoMontagemResistenciaChoices` */
export const tipoMontagemResistenciaOptions = [
  { value: 'TRILHO_DIN', label: 'Trilho DIN' },
  { value: 'PARAFUSADA', label: 'Parafusada' },
  { value: 'OUTRO', label: 'Outro' },
] as const

/** `TipoMontagemTemporizadorChoices` */
export const tipoMontagemTemporizadorOptions = [
  { value: 'TRILHO_DIN', label: 'Trilho DIN' },
  { value: 'PORTA', label: 'Porta' },
  { value: 'PLACA', label: 'Placa' },
  { value: 'OUTRO', label: 'Outro' },
] as const
