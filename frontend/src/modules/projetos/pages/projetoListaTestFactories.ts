/**
 * Reduz duplicação nos testes de ProjetoListPage — mesmos campos elétricos/obrigatórios por linha.
 */

export type ProjetoListaLinhaFixture = Record<string, unknown>

const defaults: ProjetoListaLinhaFixture = {
  descricao: '',
  cliente: 'Cliente',
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
  tipo_corrente_comando: 'CA',
  tensao_comando: 220,
  possui_plc: false,
  familia_plc: null,
  possui_ihm: false,
  possui_switches: false,
  possui_plaqueta_identificacao: false,
  possui_faixa_identificacao: false,
  possui_adesivo_alerta: false,
  possui_adesivos_tensao: false,
  possui_climatizacao: false,
  tipo_climatizacao: null,
  fator_demanda: '1.00',
  degraus_margem_bitola_condutores: 0,
  possui_seccionamento: false,
  tipo_seccionamento: null,
}

/** Linha de projeto para mocks de lista (somente campos repetidos são preenchidos pelo spread). */
export function projetoListaLinha(
  overrides: ProjetoListaLinhaFixture
): ProjetoListaLinhaFixture {
  return { ...defaults, ...overrides }
}
