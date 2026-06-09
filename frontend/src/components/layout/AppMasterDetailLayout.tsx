import type { ReactNode } from 'react'

import { useMediaQuery } from '@/hooks/useMediaQuery'

type Props = Readonly<{
  list: ReactNode
  detail: ReactNode
  showDetail: boolean
  onBackToList: () => void
  listColClassName?: string
  detailColClassName?: string
  breakpoint?: string
}>

/** Layout lista + detalhe: lado a lado no desktop; lista ou detalhe no mobile. */
export default function AppMasterDetailLayout({
  list,
  detail,
  showDetail,
  onBackToList,
  listColClassName = 'col-xl-5',
  detailColClassName = 'col-xl-7',
  breakpoint = '(max-width: 1199.98px)',
}: Props) {
  const stacked = useMediaQuery(breakpoint)

  if (!stacked) {
    return (
      <div className="row g-4 align-items-start app-master-detail">
        <div className={listColClassName}>{list}</div>
        <div className={detailColClassName}>{detail}</div>
      </div>
    )
  }

  if (!showDetail) {
    return <div className="app-master-detail app-master-detail--stacked">{list}</div>
  }

  return (
    <div className="app-master-detail app-master-detail--stacked">
      <button
        type="button"
        className="btn btn-link btn-sm ps-0 mb-3 app-master-detail__back"
        onClick={onBackToList}
      >
        ← Voltar à lista
      </button>
      {detail}
    </div>
  )
}
