import { type Lang, sampleInvitation, type ThemeId, themes } from '@app/api/invitation-model'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { Invitation } from './render'
import { Stage } from './stage'

export function ThemePreviewPage() {
  const { theme } = useParams({ from: '/tema/$theme' }) as { theme: ThemeId }
  const { lang = 'id' } = useSearch({ from: '/tema/$theme' })
  const navigate = useNavigate()
  const doc = useMemo(() => sampleInvitation(theme, lang as Lang), [theme, lang])
  const info = themes.find((item) => item.id === theme)
  useEffect(() => {
    document.title = `${info?.name ?? 'Tema'} · Hari Bersama`
  }, [info])
  return (
    <Stage
      theme={theme}
      bar={
        <div className="stage-bar">
          <Link to="/tema" className="stage-chip" aria-label="Kembali ke semua tema">
            ‹ Tema
          </Link>
          <fieldset className="stage-toggle">
            <legend className="sr-only">Bahasa contoh</legend>
            {(['id', 'en'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={lang === value}
                onClick={() =>
                  navigate({ to: '/tema/$theme', params: { theme }, search: { lang: value }, replace: true })
                }
              >
                {value.toUpperCase()}
              </button>
            ))}
          </fieldset>
          <Link to="/buat" search={{ tema: theme }} className="stage-chip is-primary">
            Pakai tema ini
          </Link>
        </div>
      }
    >
      <Invitation key={`${theme}-${lang}`} doc={doc} mode="preview" />
    </Stage>
  )
}
