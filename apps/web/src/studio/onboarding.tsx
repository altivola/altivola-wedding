import { isThemeId, type Lang, type ThemeId, themes } from '@app/api/invitation-model'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { cn } from 'cn'
import { useEffect, useState } from 'react'
import { rememberDraft, setActiveDraft } from '@/lib/drafts'
import { client, errorMessage } from '@/lib/orpc'
import { HeroDoodle } from '@/site/doodles'
import { ThemeCard, ThemeFilters, useThemeFilter } from '@/site/theme-grid'
import { Icon } from './icons'
import './studio.css'

const kinds = [
  { id: 'wedding', title: 'Pernikahan', text: 'Rayakan hari besarmu bersama orang tersayang', ready: true },
  { id: 'birthday', title: 'Ulang tahun', text: 'Segera hadir', ready: false },
  { id: 'office', title: 'Acara kantor', text: 'Segera hadir', ready: false },
] as const

const stepNames = ['Jenis', 'Tema', 'Mempelai'] as const

export function OnboardingPage() {
  const { tema } = useSearch({ from: '/buat' })
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [theme, setTheme] = useState<ThemeId | null>(tema && isThemeId(tema) ? tema : null)
  const [lang, setLang] = useState<Lang>('id')
  const [bride, setBride] = useState('')
  const [groom, setGroom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const { list, filters } = useThemeFilter()

  useEffect(() => {
    document.title = 'Buat undangan · Hari Bersama'
  }, [])

  const canContinue = step === 0 || (step === 1 && theme) || (step === 2 && bride.trim() && groom.trim())

  const start = async () => {
    if (!theme) return
    setBusy(true)
    setError('')
    try {
      const created = await client.invitations.create({ theme, lang, bride: bride.trim(), groom: groom.trim() })
      if (created.token) rememberDraft(created.id, created.token)
      setActiveDraft(created.id)
      setDone(true)
      window.setTimeout(() => navigate({ to: '/studio/$id', params: { id: created.id } }), 1300)
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="ob-done">
        <HeroDoodle className="ob-done-art" />
        <h1>Siap! Undanganmu sedang disiapkan.</h1>
      </div>
    )
  }

  return (
    <div className="ob">
      <header className="ob-top">
        <button
          type="button"
          className="st-icon-button"
          aria-label="Kembali"
          onClick={() => (step === 0 ? navigate({ to: '/' }) : setStep(step - 1))}
        >
          <Icon name="back" />
        </button>
        <span className="ob-count">
          {step + 1}/{stepNames.length}
        </span>
      </header>
      <div className="ob-progress" aria-hidden="true">
        {stepNames.map((name, index) => (
          <span key={name} className={cn(index <= step && 'is-on')} />
        ))}
      </div>
      <main className="ob-body">
        <p className="ob-kicker">
          Langkah {step + 1} dari {stepNames.length} · {stepNames[step]}
        </p>
        {step === 0 && (
          <>
            <h1>Mau bikin undangan apa?</h1>
            <p className="ob-lead">Pilih jenis undangannya. Akun baru dibutuhkan saat kamu menyimpan.</p>
            <div className="ob-kinds">
              {kinds.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  className={cn('ob-kind', kind.id === 'wedding' && 'is-on')}
                  disabled={!kind.ready}
                  onClick={() => setStep(1)}
                >
                  <span className="ob-kind-art">{kind.id === 'wedding' ? <HeroDoodle /> : <span>Segera</span>}</span>
                  <strong>{kind.title}</strong>
                  <small>{kind.text}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>Pilih tampilan</h1>
            <p className="ob-lead">Pilih satu tema. Semua warna, foto, dan kata masih bisa kamu ubah nanti.</p>
            <ThemeFilters {...filters} />
            <div className="ob-themes">
              {list.map((item) => (
                <ThemeCard
                  key={item.id}
                  theme={item}
                  action={{
                    label: theme === item.id ? 'Terpilih' : 'Pilih',
                    selected: theme === item.id,
                    onClick: () => setTheme(item.id),
                  }}
                />
              ))}
            </div>
            <div className="ob-lang">
              <span>Bahasa teks bawaan</span>
              <div className="st-segment">
                {(
                  [
                    ['id', 'Bahasa Indonesia'],
                    ['en', 'English'],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={lang === value} onClick={() => setLang(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Ceritakan tentang mempelai</h1>
            <p className="ob-lead">Cukup nama panggilan dulu. Nama lengkap dan orang tua bisa diisi di builder.</p>
            <form
              className="ob-names"
              onSubmit={(event) => {
                event.preventDefault()
                if (canContinue) void start()
              }}
            >
              <label className="st-label">
                Nama panggilan mempelai wanita
                <input
                  className="st-input is-large"
                  value={bride}
                  onChange={(event) => setBride(event.target.value)}
                  maxLength={40}
                />
              </label>
              <label className="st-label">
                Nama panggilan mempelai pria
                <input
                  className="st-input is-large"
                  value={groom}
                  onChange={(event) => setGroom(event.target.value)}
                  maxLength={40}
                />
              </label>
              {error && <p className="st-error">{error}</p>}
              <button type="submit" hidden />
            </form>
          </>
        )}
      </main>
      <footer className="ob-foot">
        <span className="ob-summary">
          {step >= 1 && theme ? `Tema: ${themes.find((item) => item.id === theme)?.name}` : ''}
        </span>
        {step < 2 ? (
          <button
            type="button"
            className="st-button is-dark is-large"
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
          >
            Lanjut
          </button>
        ) : (
          <button type="button" className="st-button is-dark is-large" disabled={!canContinue || busy} onClick={start}>
            {busy ? 'Menyiapkan...' : 'Mulai bikin'}
          </button>
        )}
      </footer>
    </div>
  )
}
