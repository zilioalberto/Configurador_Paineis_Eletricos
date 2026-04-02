/** Espelha os TextChoices do backend (core.choices). */

export const unidadePotenciaCorrenteOptions = [
  { value: 'CV', label: 'CV' },
  { value: 'KW', label: 'kW' },
  { value: 'A', label: 'A' },
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
  { value: 'OUTRO', label: 'Outro' },
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
  { value: 'OUTRO', label: 'Outro' },
] as const

export const tipoSinalOptions = [
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'ANALOGICO', label: 'Analógico' },
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
  { value: 'OUTRO', label: 'Outro' },
] as const
