import { useMutation, useQuery } from '@tanstack/react-query'
import { createRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { authClient } from '@/lib/auth'
import { orpc } from '@/lib/orpc'
import { rootRoute } from './root'

const safeNext = (value: string | undefined) => (value?.startsWith('/') && !value.startsWith('//') ? value : '/studio')

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: z.object({ next: z.string().max(200).optional(), alasan: z.string().max(120).optional() }),
  beforeLoad: async ({ search }) => {
    const { data } = await authClient.getSession()
    if (data) throw redirect({ href: safeNext(search.next) })
  },
  component: LoginPage,
})

const socialProviders = ['google', 'github'] as const
const providerLabels = { google: 'Google', github: 'GitHub' } as const

function LoginPage() {
  const { next, alasan } = loginRoute.useSearch()
  const target = safeNext(next)
  const [email, setEmail] = useState('')
  const providers = useQuery(orpc.authProviders.queryOptions())
  const useHub = providers.data?.includes('altivola') ?? false
  const emailEnabled = !useHub && (providers.data?.includes('email') ?? false)
  const oauthProviders = socialProviders.filter((provider) => useHub || providers.data?.includes(provider))

  const magicLink = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signIn.magicLink({ email, callbackURL: target })
      if (error) throw new Error(error.message ?? 'Link masuk gagal dikirim')
    },
  })

  const oauth = useMutation({
    mutationFn: async (provider: keyof typeof providerLabels) => {
      const { data, error } = await authClient.signIn.social({
        provider: useHub ? 'altivola' : provider,
        callbackURL: target,
        errorCallbackURL: `/login?next=${encodeURIComponent(target)}`,
        disableRedirect: useHub,
      })
      if (error) throw new Error(error.message ?? 'Tidak bisa mulai masuk')
      if (useHub) {
        if (!data?.url) throw new Error('Tidak bisa mulai masuk')
        const authorize = new URL(data.url)
        authorize.searchParams.set('altivola_provider', provider)
        window.location.assign(authorize)
      }
    },
  })
  const callbackFailed = new URLSearchParams(window.location.search).has('error')

  return (
    <div className="flex min-h-dvh flex-col bg-paper px-4">
      <header className="mx-auto flex w-full max-w-5xl items-center py-5">
        <Link to="/" className="font-serif text-2xl font-semibold tracking-tight text-ink">
          hari bersama<span className="text-terra">.</span>
        </Link>
      </header>
      <main className="mx-auto mt-10 w-full max-w-sm flex-1">
        <div className="rounded-[28px] border border-border bg-white p-7 shadow-[0_20px_50px_rgb(28_26_22/0.08)]">
          <h1 className="font-display text-3xl font-bold">Masuk dulu, yuk</h1>
          <p className="mt-2 text-sm text-soft">
            {alasan ?? 'Simpan undanganmu, kirim ke tamu, dan pantau balasan mereka dari mana saja.'}
          </p>
          <div className="mt-6 space-y-3">
            {emailEnabled &&
              (magicLink.isSuccess ? (
                <p className="rounded-2xl bg-sand p-4 text-sm">
                  Cek email <strong>{email}</strong> untuk link masuk.
                  {import.meta.env.DEV && (
                    <>
                      {' '}
                      Di lokal, buka{' '}
                      <a className="underline" href="http://localhost:8026" target="_blank" rel="noreferrer">
                        Mailpit
                      </a>
                      .
                    </>
                  )}
                </p>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    magicLink.mutate()
                  }}
                >
                  <label className="block text-sm font-semibold" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-input bg-paper px-4 outline-none focus:border-ink"
                  />
                  {magicLink.error && <p className="text-sm text-terra">{magicLink.error.message}</p>}
                  <button
                    type="submit"
                    disabled={magicLink.isPending}
                    className="h-12 w-full rounded-full bg-ink font-semibold text-white disabled:opacity-60"
                  >
                    {magicLink.isPending ? 'Mengirim...' : 'Kirim link masuk'}
                  </button>
                </form>
              ))}
            {(oauth.error || callbackFailed) && (
              <p role="alert" className="text-sm text-terra">
                {oauth.error?.message ?? 'Gagal masuk. Coba lagi.'}
              </p>
            )}
            {oauthProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                disabled={oauth.isPending}
                onClick={() => oauth.mutate(provider)}
                className="h-12 w-full rounded-full border border-input bg-white font-semibold hover:bg-sand disabled:opacity-60"
              >
                Lanjut dengan {providerLabels[provider]}
              </button>
            ))}
            {providers.isSuccess && !emailEnabled && oauthProviders.length === 0 && (
              <p className="text-sm text-soft">Belum ada cara masuk yang aktif di server ini.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
