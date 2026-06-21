import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import RefreshButton from '@/components/RefreshButton'

interface Props {
  title: string
  subtitle?: string
  back?: boolean
  refreshable?: boolean
}

export default function ScreenHeader({ title, subtitle, back, refreshable }: Props) {
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the new screen's heading on mount so screen-reader users are
  // told the view changed (route-change announcement).
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <header className={'screen-header' + (back ? ' with-back' : '')}>
      {back ? (
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      <div className="screen-header-text">
        <h1 ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {refreshable ? (
        <div className="screen-header-actions">
          <RefreshButton />
        </div>
      ) : null}
    </header>
  )
}
