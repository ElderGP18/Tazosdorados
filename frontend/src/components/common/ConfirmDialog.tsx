import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmLabel?: string
  loading?: boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm, title = 'Confirmar acción',
  message, confirmLabel = 'Eliminar', loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle size={18} className="text-red-600" />
        </div>
        <div>
          <p className="text-sm text-gray-700">{message}</p>
          <div className="flex gap-3 mt-5">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancelar
            </button>
            <button onClick={onConfirm} className="btn-danger flex-1" disabled={loading}>
              {loading ? <Spinner size="sm" className="text-white" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
