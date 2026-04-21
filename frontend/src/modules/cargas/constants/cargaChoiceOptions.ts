/** Espelha os TextChoices do backend (core.choices). */

export const unidadePotenciaCorrenteOptions = [
  { value: 'CV', label: 'CV' },
  { value: 'KW', label: 'kW' },
  { value: 'A', label: 'A' },
] as const

export const numeroFasesOptions = [
  { value: '1', label: 'Monofásico' },
  { value: '3', label: 'Trifásico' },
] as const

export const tensaoOptions = [
  { value: '12', label: '12 V' },
  { value: '24', label: '24 V' },
  { value: '48', label: '48 V' },
  { value: '90', label: '90 V' },
  { value: '110', label: '110 V' },
  { value: '127', label: '127 V' },
  { value: '220', label: '220 V' },
  { value: '380', label: '380 V' },
  { value: '440', label: '440 V' },
] as const

export const tipoCorrenteOptions = [
  { value: 'CA', label: 'Corrente Alternada (CA)' },
  { value: 'CC', label: 'Corrente Contínua (CC)' },
] as const

export const tipoPartidaMotorOptions = [
  { value: 'DIRETA', label: 'Direta' },
  { value: 'ESTRELA_TRIANGULO', label: 'Estrela-Triângulo' },
  { value: 'SOFT_STARTER', label: 'Soft Starter' },
  { value: 'INVERSOR', label: 'Inversor' },
  { value: 'SERVO_DRIVE', label: 'Servo Drive' },
] as const

export const tipoProtecaoMotorOptions = [
  { value: 'DISJUNTOR_MOTOR', label: 'Disjuntor motor' },
  { value: 'RELE_SOBRECARGA', label: 'Relé de sobrecarga' },
  { value: 'FUSIVEL', label: 'Fusível' },
  { value: 'MINI_DISJUNTOR', label: 'Mini disjuntor' },
  { value: 'FUSIVEL_ULTRARRAPIDO', label: 'Fusível ultrarrápido' },
] as const

export const tipoProtecaoValvulaOptions = [
  { value: 'MINI_DISJUNTOR', label: 'Mini disjuntor' },
  { value: 'BORNE_FUSIVEL', label: 'Borne fusível' },
  { value: 'SEM_PROTECAO', label: 'Sem proteção' },
] as const

export const tipoAcionamentoValvulaOptions = [
  { value: 'SOLENOIDE_DIRETO', label: 'Solenoide direto' },
  { value: 'RELE_ESTADO_SOLIDO', label: 'Relé de estado sólido' },
  { value: 'RELE_ACOPLADOR', label: 'Relé acoplador' },
  { value: 'CONTATOR', label: 'Contator' },
] as const

export const tipoProtecaoResistenciaOptions = [
  { value: 'DISJUNTOR_MOTOR', label: 'Disjuntor motor' },
  { value: 'FUSIVEL_ULTRARRAPIDO', label: 'Fusível ultrarrápido' },
  { value: 'MINI_DISJUNTOR', label: 'Mini disjuntor' },
] as const

export const tipoAcionamentoResistenciaOptions = [
  { value: 'CONTATOR', label: 'Contator' },
  { value: 'RELE_ESTADO_SOLIDO', label: 'Relé de estado sólido' },
] as const

export const tipoConexaoCargaPainelOptions = [
  { value: 'CONEXAO_BORNES_COM_PE', label: 'Conexão a bornes com PE' },
  { value: 'CONEXAO_BORNES_SEM_PE', label: 'Conexão a bornes sem PE' },
  {
    value: 'CONEXAO_DIRETO_COMPONENTE',
    label: 'Conexão direta ao componente',
  },
  { value: 'OUTROS', label: 'Outros' },
] as const

export const tipoValvulaOptions = [
  { value: 'SOLENOIDE', label: 'Solenóide' },
  { value: 'PROPORCIONAL', label: 'Proporcional' },
  { value: 'MOTORIZADA', label: 'Motorizada' },
  { value: 'PNEUMATICA', label: 'Pneumática' },
  { value: 'OUTRA', label: 'Outra' },
] as const

export const tipoSensorOptions = [
  { value: 'INDUTIVO', label: 'Indutivo' },
  { value: 'CAPACITIVO', label: 'Capacitivo' },
  { value: 'FOTOELETRICO', label: 'Fotoelétrico' },
  { value: 'FIM_DE_CURSO', label: 'Fim de curso' },
  { value: 'PRESSOSTATO', label: 'Pressostato' },
  { value: 'TERMOSTATO', label: 'Termostato' },
  { value: 'CHAVE_NIVEL', label: 'Chave de nível' },
  { value: 'ENCODER', label: 'Encoder' },
] as const

export const tipoSinalOptions = [
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'ANALOGICO', label: 'Analógico' },
  { value: 'ANALOGICO_DIGITAL', label: 'Analógico/Digital' },
  { value: 'PULSO', label: 'Pulso' },
  { value: 'COMUNICACAO', label: 'Comunicação' },
] as const

export const tipoSinalAnalogicoOptions = [
  { value: 'TENSAO_0_10VCC', label: 'Tensão 0-10 VCC' },
  { value: 'TENSAO_M10_10VCC', label: 'Tensão -10 a 10 VCC' },
  { value: 'CORRENTE_0_20MA', label: 'Corrente 0-20 mA' },
  { value: 'CORRENTE_4_20MA', label: 'Corrente 4-20 mA' },
  { value: 'TEMPERATURA_PT100', label: 'Temperatura PT100' },
  { value: 'TEMPERATURA_RTD', label: 'Temperatura RTD' },
  { value: 'OUTROS', label: 'Outros' },
] as const

export const tipoTransdutorOptions = [
  { value: 'PRESSAO', label: 'Pressão' },
  { value: 'TEMPERATURA', label: 'Temperatura' },
  { value: 'NIVEL', label: 'Nível' },
  { value: 'VAZAO', label: 'Vazão' },
  { value: 'POSICAO', label: 'Posição' },
  { value: 'CORRENTE', label: 'Corrente' },
  { value: 'TENSAO', label: 'Tensão' },
] as const
