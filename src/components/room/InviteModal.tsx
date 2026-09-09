import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, QrCode, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'

interface InviteModalProps {
  url: string
  isOpen: boolean
  onClose: () => void
  roomTitle?: string
}

export function InviteModal({ url, isOpen, onClose, roomTitle }: InviteModalProps) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (url) {
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#151417',
          light: '#FFFFFF',
        },
      })
        .then(setQrDataUrl)
        .catch((err) => console.error('[InviteModal] QR generate error:', err))
    }
  }, [url])

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative w-full max-w-sm rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl z-10"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <X size={18} />
          </button>

          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--color-signal)]/10 text-[var(--color-signal)] mb-1">
              <QrCode size={24} />
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-[var(--color-fg)]">
                Invite to Wavelength
              </h3>
              {roomTitle && (
                <p className="text-xs text-[var(--color-muted)] truncate max-w-xs mx-auto mt-0.5">
                  "{roomTitle}"
                </p>
              )}
            </div>

            {/* QR Code display */}
            <div className="flex justify-center my-3">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-[var(--color-border)]">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Room QR Code"
                    className="w-48 h-48 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400">
                    Generating QR…
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)] font-medium">
              <Smartphone size={14} className="text-[var(--color-signal)]" />
              <span>Scan from your phone or another device</span>
            </div>

            {/* Copy link input row */}
            <div className="pt-2">
              <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                <input
                  readOnly
                  value={url}
                  className="bg-transparent text-xs text-[var(--color-fg)] flex-1 outline-none font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-signal)] text-white text-xs font-semibold hover:opacity-95 active:scale-95 transition-all shrink-0"
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
