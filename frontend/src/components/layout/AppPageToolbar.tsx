import { Link } from 'react-router-dom'

import type { AppPageToolbarConfig } from './AppPageToolbarContext'

type Props = Readonly<{
  toolbar: AppPageToolbarConfig
}>

export default function AppPageToolbar({ toolbar }: Props) {
  const { title, subtitle, badges, back, fluxoSteps, primaryAction, actions } = toolbar

  return (
    <div className="app-header-page-toolbar">
      {back ? (
        <Link to={back.to} className="app-header-page-back" onClick={(e) => e.stopPropagation()}>
          {back.label}
        </Link>
      ) : null}
      <div className="app-header-page-toolbar__text min-w-0">
        <h1 className="app-header-page-title text-truncate">{title}</h1>
        {subtitle ? (
          <p className="app-header-page-subtitle text-truncate mb-0">{subtitle}</p>
        ) : null}
      </div>
      {fluxoSteps ? (
        <div className="app-header-page-fluxo d-none d-lg-flex min-w-0">{fluxoSteps}</div>
      ) : null}
      {badges && badges.length > 0 ? (
        <div className="app-header-page-badges">
          {badges.map((badge) => (
            <span
              key={badge.key}
              className={`app-header-page-badge${badge.variant === 'primary' ? ' is-primary' : ''}`}
            >
              {badge.text}
            </span>
          ))}
        </div>
      ) : null}
      <div className="app-header-page-actions">
        {actions}
        {primaryAction ? (
          <button
            type={primaryAction.onClick ? 'button' : 'submit'}
            form={primaryAction.onClick ? undefined : primaryAction.formId}
            className="btn btn-success btn-sm app-header-page-submit"
            disabled={primaryAction.disabled || primaryAction.loading}
            onClick={primaryAction.onClick}
          >
            {primaryAction.loading
              ? primaryAction.loadingLabel ?? 'Salvando…'
              : primaryAction.label}
          </button>
        ) : null}
      </div>
    </div>
  )
}
