import { selectOptionsParaCampo } from '../constants/specSelectRegistry'
import { usePlcFamiliasQuery } from '../hooks/usePlcFamiliasQuery'
import type { CategoriaProdutoNome } from '../types/categoria'
import { labelCampoEspec, SPEC_FIELDS_BY_CATEGORIA } from '../utils/specFormHelpers'

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

type Props = {
  categoria: CategoriaProdutoNome
  value: Record<string, string | number | boolean>
  onPatch: (patch: Record<string, string | number | boolean>) => void
}

type PlcFamiliaCampoProps = {
  label: string
  value: string
  onChange: (v: string) => void
  /** Evita ids duplicados quando há PLC e expansão no mesmo documento. */
  fieldId?: string
}

function PlcFamiliaCampo({
  label,
  value,
  onChange,
  fieldId = 'spec-plc-familia',
}: PlcFamiliaCampoProps) {
  const { data } = usePlcFamiliasQuery()
  const id = fieldId
  const listId = `${id}-sugestoes`
  const sugestoes = data?.familias ?? []

  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="form-control"
        list={listId}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {sugestoes.map((f) => (
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
  if (categoria !== 'DISJUNTOR_CAIXA_MOLDADA') return false
  if (!configuracao) return false

  const irAjuste = new Set([
    'disparador_sobrecarga_ir_ajuste_min_a',
    'disparador_sobrecarga_ir_ajuste_max_a',
  ])
  const iiAjuste = new Set([
    'disparador_curto_ii_ajuste_min_a',
    'disparador_curto_ii_ajuste_max_a',
  ])

  if (DCM_CFG_FIXO.has(configuracao)) {
    return irAjuste.has(campo) || iiAjuste.has(campo)
  }
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
  if (campo === 'tipo_dissipador' && !Boolean(value.possui_dissipador)) return true
  if (campo === 'tensao_ventilacao_v' && !Boolean(value.possui_ventilacao)) return true
  return false
}

function deveOcultarCampoPainel(
  categoria: CategoriaProdutoNome,
  campo: string,
  value: Record<string, string | number | boolean>
): boolean {
  if (categoria !== 'PAINEL') return false
  if (campo !== 'cor') return false
  return String(value.material ?? '') === 'ACO_INOX'
}

export default function EspecificacaoCatalogoFields({
  categoria,
  value,
  onPatch,
}: Props) {
  const fields = SPEC_FIELDS_BY_CATEGORIA[categoria]
  if (!fields?.length) return null

  function patch(k: string, v: string | number | boolean) {
    onPatch({ [k]: v })
  }

  return (
    <>
      <div className="col-12 mt-3">
        <h2 className="h6 text-muted mb-2">Especificação técnica</h2>
        <p className="small text-muted mb-0">
          Campos alinhados aos modelos do catálogo no servidor. Na criação, pode deixar em
          branco: a API aplica valores padrão da categoria quando o objeto da especificação
          está vazio.
        </p>
      </div>
      {fields.map(({ name, django }) => {
        const configuracaoDcm = String(value.configuracao_disparador ?? '')
        if (deveOcultarCampoDcm(categoria, name, configuracaoDcm)) return null
        if (deveOcultarCampoReleEstadoSolido(categoria, name, value)) return null
        if (deveOcultarCampoPainel(categoria, name, value)) return null

        const label = labelCampoEspec(name)
        let opts = selectOptionsParaCampo(categoria, name)
        const current = value[name]

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

        if (
          categoria === 'EXPANSAO_PLC' &&
          name === 'tipo_sinal_analogico' &&
          Number(value.entradas_analogicas ?? 0) +
            Number(value.saidas_analogicas ?? 0) <=
            0
        ) {
          return null
        }

        if (
          categoria === 'PLC' &&
          name === 'tipo_entradas_analogicas' &&
          Number(value.entradas_analogicas ?? 0) <= 0
        ) {
          return null
        }
        if (
          categoria === 'PLC' &&
          name === 'tipo_saidas_analogicas' &&
          Number(value.saidas_analogicas ?? 0) <= 0
        ) {
          return null
        }

        if (categoria === 'FUSIVEL' && name === 'tamanho') {
          const formato = String(value.formato ?? '')
          if (formato === 'NH') opts = FUSIVEL_TAMANHOS_NH
          else if (formato === 'CARTUCHO') opts = FUSIVEL_TAMANHOS_CARTUCHO
          else opts = undefined
        }

        if (django === 'BooleanField') {
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
                      onPatch({
                        possui_dissipador: checked,
                        ...(checked ? {} : { tipo_dissipador: '' }),
                      })
                      return
                    }
                    if (categoria === 'RELE_ESTADO_SOLIDO' && name === 'possui_ventilacao') {
                      onPatch({
                        possui_ventilacao: checked,
                        ...(checked ? {} : { tensao_ventilacao_v: '' }),
                      })
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

        if (opts?.length) {
          const numericOpts = opts.every((o) => typeof o.value === 'number')
          let strVal =
            current === undefined || current === null ? '' : String(current)
          const djangoNumeric =
            django === 'DecimalField' ||
            django === 'IntegerField' ||
            django === 'PositiveIntegerField' ||
            django === 'PositiveSmallIntegerField'
          if (
            numericOpts &&
            current !== '' &&
            current != null &&
            djangoNumeric
          ) {
            const n = Number(current)
            if (Number.isFinite(n)) {
              const matched = opts.find((o) => Number(o.value) === n)
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
                  if (
                    categoria === 'DISJUNTOR_CAIXA_MOLDADA' &&
                    name === 'configuracao_disparador'
                  ) {
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
                  if (numericOpts) {
                    patch(name, Number(v))
                  } else {
                    patch(name, v)
                  }
                }}
              >
                <option value="">—</option>
                {opts.map((o) => (
                  <option key={String(o.value)} value={String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )
        }

        if (django === 'TextField') {
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
              inputMode={
                django === 'DecimalField' || isInt ? 'decimal' : undefined
              }
              className="form-control"
              value={
                current === undefined || current === null ? '' : String(current)
              }
              onChange={(e) => {
                const v = e.target.value
                if (isInt) {
                  if (v === '') {
                    if (categoria === 'PLC' && name === 'entradas_analogicas') {
                      onPatch({
                        entradas_analogicas: '',
                        tipo_entradas_analogicas: '',
                      })
                    } else if (categoria === 'PLC' && name === 'saidas_analogicas') {
                      onPatch({
                        saidas_analogicas: '',
                        tipo_saidas_analogicas: '',
                      })
                    } else if (
                      categoria === 'EXPANSAO_PLC' &&
                      name === 'entradas_analogicas'
                    ) {
                      const nextSai = Number(value.saidas_analogicas ?? 0) || 0
                      onPatch({
                        entradas_analogicas: '',
                        ...(nextSai === 0 ? { tipo_sinal_analogico: '' } : {}),
                      })
                    } else if (
                      categoria === 'EXPANSAO_PLC' &&
                      name === 'saidas_analogicas'
                    ) {
                      const nextEnt = Number(value.entradas_analogicas ?? 0) || 0
                      onPatch({
                        saidas_analogicas: '',
                        ...(nextEnt === 0 ? { tipo_sinal_analogico: '' } : {}),
                      })
                    } else {
                      patch(name, '')
                    }
                    return
                  }
                  const n = Number.parseInt(v, 10)
                  const num = Number.isFinite(n) ? n : ''
                  if (
                    categoria === 'PLC' &&
                    name === 'entradas_analogicas' &&
                    num === 0
                  ) {
                    onPatch({
                      entradas_analogicas: 0,
                      tipo_entradas_analogicas: '',
                    })
                  } else if (
                    categoria === 'PLC' &&
                    name === 'saidas_analogicas' &&
                    num === 0
                  ) {
                    onPatch({
                      saidas_analogicas: 0,
                      tipo_saidas_analogicas: '',
                    })
                  } else if (
                    categoria === 'EXPANSAO_PLC' &&
                    (name === 'entradas_analogicas' || name === 'saidas_analogicas') &&
                    typeof num === 'number'
                  ) {
                    const nextEnt =
                      name === 'entradas_analogicas'
                        ? num
                        : Number(value.entradas_analogicas ?? 0) || 0
                    const nextSai =
                      name === 'saidas_analogicas'
                        ? num
                        : Number(value.saidas_analogicas ?? 0) || 0
                    onPatch({
                      [name]: num,
                      ...(nextEnt + nextSai === 0
                        ? { tipo_sinal_analogico: '' }
                        : {}),
                    })
                  } else {
                    patch(name, num)
                  }
                  return
                }
                patch(name, v)
              }}
            />
          </div>
        )
      })}
    </>
  )
}
