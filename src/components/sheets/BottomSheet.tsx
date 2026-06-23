'use client'
import { ReactNode } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function BottomSheet({ isOpen, onClose, children, title }: Props) {
  return (
    <div className={`bottom-sheet${isOpen ? ' open' : ''}`}>
      <div className="drag-handle" onClick={onClose} style={{ cursor: 'pointer' }} />
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 0' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
          <div onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>
      )}
      <div className="sheet-scroll">
        {children}
      </div>
    </div>
  )
}
