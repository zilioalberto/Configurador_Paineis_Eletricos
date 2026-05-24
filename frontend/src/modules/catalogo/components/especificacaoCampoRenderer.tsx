/** Renderização dinâmica de campos de especificação por categoria. */

import type { ReactNode } from 'react'
import { selectOptionsParaCampo } from '../constants/specSelectRegistry'
import { usePlcFamiliasQuery } from '../hooks/usePlcFamiliasQuery'
import type { CategoriaProdutoNome } from '../types/categoria'
import { patchIntEspecField } from '../utils/especificacaoFieldPatch'
import { labelCampoEspec } from '../utils/specFormHelpers'

const FUSIVEL_TAMANHOS_NH = [
  { value: 'NH000', label: 'NH000' },
  { value: 'NH00', label: 'NH00' },
  { value: 'NH1', label: 'NH1' },
  { value: 'NH2', label: 'NH2' },
  { value: 'NH3', label: 'NH3' },
] as const

const FUSIVEL_TAMANHOS_CARTUCHO = [
  { value: '5x20', label: '5 x 20 mm' },
  { value: '6x30', label: '6 x 30 mm' },
  { value: '10x38', label: '10 x 38 mm' },
  { value: '14x51', label: '14 x 51 mm' },
  { value: '22x58', label: '22 x 58 mm' },
] as const

const DCM_CFG_FIXO = new Set([
  'TERMOMAGNETICO_IR_II_FIXOS',
  'TERMOMAGNETICO_LI_IR_II_FIXOS',
])
const DCM_CFG_IR_AJUSTAVEL_II_FIXO = 'TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO'
const DCM_CFG_II_AJUSTAVEL = 'TERMOMAGNETICO_LI_II_AJUSTAVEL'

function patchLimpezaDcmConfig(configuracao: string): Record<string, string> {
  if (DCM_CFG_FIXO.has(configuracao)) {
    return {
      configuracao_disparador: configuracao,
      disparador_sobrecarga_ir_ajuste_min_a: '',
      disparador_sobrecarga_ir_ajuste_max_a: '',
      disparador_curto_ii_ajuste_min_a: '',
      disparador_curto_ii_ajuste_max_a: '',
    }
  }
  if (configuracao === DCM_CFG_IR_AJUSTAVEL_II_FIXO) {
    return {
      configuracao_disparador: configuracao,
      disparador_sobrecarga_ir_fixo_a: '',
      disparador_curto_ii_ajuste_min_a: '',
      disparador_curto_ii_ajuste_max_a: '',
    }
  }
  if (configuracao === DCM_CFG_II_AJUSTAVEL) {
    return {
      configuracao_disparador: configuracao,
      disparador_sobrecarga_ir_ajuste_min_a: '',
      disparador_sobrecarga_ir_ajuste_max_a: '',
      disparador_curto_ii_fixo_a: '',
    }
  }
  return { configuracao_disparador: configuracao }
}

function deveOcultarCampoDcm(
  categoria: CategoriaProdutoNome,
  campo: string,
  configuracao: string
): boolean {
  if (categoria !== 'DISJUNTOR_CAIXA_MOLDADA' || !configuracao) return false
  const irAjuste = new Set([
    'disparador_sobrecarga_ir_ajuste_min_a',
    'disparador_sobrecarga_ir_ajuste_max_a',
  ])
  const iiAjuste = new Set([
    'disparador_curto_ii_ajuste_min_a',
    'disparador_curto_ii_ajuste_max_a',
  ])
  if (DCM_CFG_FIXO.has(configuracao)) return irAjuste.has(campo) || iiAjuste.has(campo)
  if (configuracao === DCM_CFG_IR_AJUSTAVEL_II_FIXO) {
    return campo === 'disparador_sobrecarga_ir_fixo_a' || iiAjuste.has(campo)
  }
  if (configuracao === DCM_CFG_II_AJUSTAVEL) {
    return irAjuste.has(campo) || campo === 'disparador_curto_ii_fixo_a'
  }
  return false
}

function deveOcultarCampoReleEstadoSolido(
  categoria: CategoriaProdutoNome,
  campo: string,
  value: Record<string, string | number | boolean>
): boolean {
  if (categoria !== 'RELE_ESTADO_SOLIDO') return false
  if (campo === 'tipo_dissipador' && !value.possui_dissipador) return true
  if (campo === 'tensao_ventilacao_v' && !value.possui_ventilacao) return true
  return false
}

function deveOcultarCampoPainel(
  categoria: CategoriaProdutoNome,
  campo: string,
  value: Record<string, string | number | boolean>
): boolean {
  return (
    categoria === 'PAINEL' &&
    campo === 'cor' &&
    String(value.material ?? '') === 'ACO_INOX'
  )
}

function PlcFamiliaCampo({
  label,
  value,
  onChange,
  fieldId = 'spec-plc-familia',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  fieldId?: string
}) {
  const { data } = usePlcFamiliasQuery()
  const listId = `${fieldId}-sugestoes`
  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        className="form-control"
        list={listId}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {(data?.familias ?? []).map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <p className="form-text small text-muted mb-0">
        Escolha uma família já usada no catálogo ou digite outra. O servidor normaliza o texto
        e impede duplicar nomes muito parecidos.
      </p>
    </div>
  )
}

function renderCampoPlcFamilia(
  categoria: CategoriaProdutoNome,
  name: string,
  label: string,
  current: unknown,
  patch: (k: string, v: string) => void
): ReactNode | null {
  if (categoria === 'PLC' && name === 'familia') {
    return (
      <PlcFamiliaCampo
        key={name}
        label={label}
        value={String(current ?? '')}
        onChange={(v) => patch(name, v)}
      />
    )
  }
  if (categoria === 'EXPANSAO_PLC' && name === 'familia_plc') {
    return (
      <PlcFamiliaCampo
        key={name}
        fieldId="spec-expansao-plc-familia"
        label={label}
        value={String(current ?? '')}
        onChange={(v) => patch(name, v)}
      />
    )
  }
  if (categoria === 'MODULO_COMUNICACAO' && name === 'familia_plc') {
    return (
      <PlcFamiliaCampo
        key={name}
        fieldId="spec-modulo-comunicacao-familia-plc"
        label={label}
        value={String(current ?? '')}
        onChange={(v) => patch(name, v)}
      />
    )
  }
  return null
}

function deveOcultarCampoAnalogico(
  categoria: CategoriaProdutoNome,
  name: string,
  value: Record<string, string | number | boolean>
): boolean {
  if (
    categoria === 'EXPANSAO_PLC' &&
    name === 'tipo_sinal_analogico' &&
    Number(value.entradas_analogicas ?? 0) + Number(value.saidas_analogicas ?? 0) <= 0
  ) {
    return true
  }
  if (categoria === 'PLC' && name === 'tipo_entradas_analogicas' && Number(value.entradas_analogicas ?? 0) <= 0) {
    return true
  }
  if (categoria === 'PLC' && name === 'tipo_saidas_analogicas' && Number(value.saidas_analogicas ?? 0) <= 0) {
    return true
  }
  return false
}

function renderCampoBoolean(
  name: string,
  label: string,
  categoria: CategoriaProdutoNome,
  current: unknown,
  patch: (k: string, v: string | number | boolean) => void,
  onPatch: (patch: Record<string, string | number | boolean>) => void
): ReactNode {
  return (
    <div key={name} className="col-md-4 d-flex align-items-end">
      <div className="form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id={`spec-${name}`}
          checked={Boolean(current)}
          onChange={(e) => {
            const checked = e.target.checked
            if (categoria === 'RELE_ESTADO_SOLIDO' && name === 'possui_dissipador') {
              onPatch({ possui_dissipador: checked, ...(checked ? {} : { tipo_dissipador: '' }) })
              return
            }
            if (categoria === 'RELE_ESTADO_SOLIDO' && name === 'possui_ventilacao') {
              onPatch({ possui_ventilacao: checked, ...(checked ? {} : { tensao_ventilacao_v: '' }) })
              return
            }
            patch(name, checked)
          }}
        />
        <label className="form-check-label" htmlFor={`spec-${name}`}>
          {label}
        </label>
      </div>
    </div>
  )
}

function renderCampoSelect(
  name: string,
  label: string,
  django: string,
  categoria: CategoriaProdutoNome,
  current: unknown,
  opts: ReturnType<typeof selectOptionsParaCampo>,
  patch: (k: string, v: string | number | boolean) => void,
  onPatch: (patch: Record<string, string | number | boolean>) => void
): ReactNode {
  const numericOpts = opts!.every((o) => typeof o.value === 'number')
  let strVal = current === undefined || current === null ? '' : String(current)
  const djangoNumeric =
    django === 'DecimalField' ||
    django === 'IntegerField' ||
    django === 'PositiveIntegerField' ||
    django === 'PositiveSmallIntegerField'
  if (numericOpts && current !== '' && current != null && djangoNumeric) {
    const n = Number(current)
    if (Number.isFinite(n)) {
      const matched = opts!.find((o) => Number(o.value) === n)
      if (matched) strVal = String(matched.value)
    }
  }
  return (
    <div key={name} className="col-md-4">
      <label className="form-label" htmlFor={`spec-${name}`}>
        {label}
      </label>
      <select
        id={`spec-${name}`}
        className="form-select"
        value={strVal}
        onChange={(e) => {
          const v = e.target.value
          if (v === '') {
            patch(name, '')
            return
          }
          if (categoria === 'DISJUNTOR_CAIXA_MOLDADA' && name === 'configuracao_disparador') {
            onPatch(patchLimpezaDcmConfig(v))
            return
          }
          if (categoria === 'FUSIVEL' && name === 'formato') {
            onPatch({ formato: v, tamanho: '' })
            return
          }
          if (categoria === 'PAINEL' && name === 'material') {
            onPatch({ material: v, ...(v === 'ACO_INOX' ? { cor: '' } : {}) })
            return
          }
          patch(name, numericOpts ? Number(v) : v)
        }}
      >
        <option value="">—</option>
        {opts!.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function opcoesEspecificacao(
  categoria: CategoriaProdutoNome,
  name: string,
  value: Record<string, string | number | boolean>
) {
  if (categoria === 'FUSIVEL' && name === 'tamanho') {
    const formato = String(value.formato ?? '')
    if (formato === 'NH') return FUSIVEL_TAMANHOS_NH
    if (formato === 'CARTUCHO') return FUSIVEL_TAMANHOS_CARTUCHO
    return undefined
  }
  return selectOptionsParaCampo(categoria, name)
}

function renderCampoTextoLongo(
  name: string,
  label: string,
  current: string | number | boolean | undefined,
  patch: (k: string, v: string | number | boolean) => void
) {
  return (
    <div key={name} className="col-12">
      <label className="form-label" htmlFor={`spec-${name}`}>
        {label}
      </label>
      <textarea
        id={`spec-${name}`}
        className="form-control"
        rows={2}
        value={String(current ?? '')}
        onChange={(e) => patch(name, e.target.value)}
      />
    </div>
  )
}

type RenderCampoInputParams = Readonly<{
  categoria: CategoriaProdutoNome
  name: string
  django: string
  label: string
  current: string | number | boolean | undefined
  value: Record<string, string | number | boolean>
  onPatch: (patch: Record<string, string | number | boolean>) => void
  patch: (k: string, v: string | number | boolean) => void
}>

function renderCampoInput({
  categoria,
  name,
  django,
  label,
  current,
  value,
  onPatch,
  patch,
}: RenderCampoInputParams) {
  const isInt =
    django === 'IntegerField' ||
    django === 'PositiveIntegerField' ||
    django === 'PositiveSmallIntegerField'

  return (
    <div key={name} className="col-md-4">
      <label className="form-label" htmlFor={`spec-${name}`}>
        {label}
      </label>
      <input
        id={`spec-${name}`}
        type={isInt ? 'number' : 'text'}
        inputMode={django === 'DecimalField' || isInt ? 'decimal' : undefined}
        className="form-control"
        value={current === undefined || current === null ? '' : String(current)}
        onChange={(e) => {
          const v = e.target.value
          if (isInt) {
            patchIntEspecField(categoria, name, v, value, onPatch, patch)
            return
          }
          patch(name, v)
        }}
      />
    </div>
  )
}

/** Renderiza um campo de especificação conforme metadados e categoria. */
export function renderCampoEspecificacao(
  categoria: CategoriaProdutoNome,
  name: string,
  django: string,
  value: Record<string, string | number | boolean>,
  onPatch: (patch: Record<string, string | number | boolean>) => void
): ReactNode | null {
  const configuracaoDcm = String(value.configuracao_disparador ?? '')
  if (deveOcultarCampoDcm(categoria, name, configuracaoDcm)) return null
  if (deveOcultarCampoReleEstadoSolido(categoria, name, value)) return null
  if (deveOcultarCampoPainel(categoria, name, value)) return null
  if (deveOcultarCampoAnalogico(categoria, name, value)) return null

  const label = labelCampoEspec(name)
  const opts = opcoesEspecificacao(categoria, name, value)
  const current = value[name]
  const patch = (k: string, v: string | number | boolean) => onPatch({ [k]: v })

  const plc = renderCampoPlcFamilia(categoria, name, label, current, (k, v) => patch(k, v))
  if (plc) return plc

  if (django === 'BooleanField') {
    return renderCampoBoolean(name, label, categoria, current, patch, onPatch)
  }
  if (opts?.length) {
    return renderCampoSelect(name, label, django, categoria, current, opts, patch, onPatch)
  }
  if (django === 'TextField') {
    return renderCampoTextoLongo(name, label, current, patch)
  }

  return renderCampoInput({
    categoria,
    name,
    django,
    label,
    current,
    value,
    onPatch,
    patch,
  })
}
