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

export const modoMontagemOptions = [
  { value: 'TRILHO_DIN', label: 'Trilho DIN' },
  { value: 'PLACA', label: 'Placa de montagem' },
  { value: 'PORTA', label: 'Porta' },
  { value: 'LATERAL', label: 'Lateral do painel' },
  { value: 'FUNDO', label: 'Fundo do painel' },
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
