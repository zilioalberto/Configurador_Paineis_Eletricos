import { useEffect, useRef } from 'react'

type Props = Readonly<{
  onChange: (dataUrl: string) => void
  disabled?: boolean
}>

export default function AssinaturaCanvas({ onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [])

  function pos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    const me = e as React.MouseEvent
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    }
  }

  function emit() {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  function iniciar(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    desenhando.current = true
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function mover(e: React.MouseEvent | React.TouchEvent) {
    if (!desenhando.current || disabled) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    emit()
  }

  function parar() {
    desenhando.current = false
    emit()
  }

  function limpar() {
    const canvas = canvasRef.current
    if (!canvas || disabled) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="assinatura-canvas">
      <canvas
        ref={canvasRef}
        width={480}
        height={120}
        className="assinatura-canvas__area"
        aria-label="Área de assinatura"
        onMouseDown={iniciar}
        onMouseMove={mover}
        onMouseUp={parar}
        onMouseLeave={parar}
        onTouchStart={iniciar}
        onTouchMove={mover}
        onTouchEnd={parar}
      />
      <button
        type="button"
        className="btn btn-sm btn-link"
        onClick={limpar}
        disabled={disabled}
      >
        Limpar assinatura
      </button>
    </div>
  )
}
