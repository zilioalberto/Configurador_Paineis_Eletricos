import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { findErpModuleByShellSlug } from '@/modules/modulos/moduleCatalog'
import { obterErpModuleMeta } from '../services/erpApi'
import type { ErpModuleMetaDto } from '../types/erp'

/** Shell de pré-visualização de módulos planejados (`/erp/m/:moduleId`). */
export default function ErpModuleShellPage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const catalogModule = moduleId ? findErpModuleByShellSlug(moduleId) : undefined
  const [meta, setMeta] = useState<ErpModuleMetaDto | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!moduleId) return
    let ativo = true
    setCarregando(true)
    setErro(null)
    void obterErpModuleMeta(moduleId)
      .then((dados) => {
        if (ativo) setMeta(dados)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar os metadados deste módulo.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [moduleId])

  return (
    <div className="container-fluid py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Módulos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {meta?.title ?? catalogModule?.title ?? moduleId}
          </li>
        </ol>
      </nav>

      {carregando ? <p className="text-muted">A carregar…</p> : null}
      {erro ? (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      ) : null}

      {meta ? (
        <article className="card shadow-sm">
          <div className="card-body">
            <p className="text-muted small mb-1">{meta.area}</p>
            <h1 className="h4">{meta.title}</h1>
            <p className="mb-3">{meta.summary}</p>
            <h2 className="h6">Pacote backend</h2>
            <p>
              <code>{meta.backend_package}</code>
            </p>
            <h2 className="h6">Notas de evolução</h2>
            <p className="mb-0">{meta.notes}</p>
          </div>
        </article>
      ) : null}
    </div>
  )
}
