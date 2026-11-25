import type { WeddingExtras } from '@app/api/wedding-design'
import { useState } from 'react'

export function WeddingContentEditor({
  value = {},
  onChange,
}: {
  value?: WeddingExtras
  onChange: (value: WeddingExtras) => void
}) {
  const [first = { name: '', parents: '' }, second = { name: '', parents: '' }] = value.partners ?? []
  const partners = [first, second]
  return (
    <details className="wedding-custom-editor">
      <summary>Profil, timeline, dan konten tambahan</summary>
      {partners.map((partner, index) => (
        <fieldset key={index === 0 ? 'first' : 'second'}>
          <legend>{index === 0 ? 'Mempelai pertama' : 'Mempelai kedua'}</legend>
          <label>
            Nama lengkap
            <input
              maxLength={100}
              value={partner.name}
              onChange={(event) =>
                onChange({
                  ...value,
                  partners: partners.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                })
              }
            />
          </label>
          <label>
            Nama orang tua
            <input
              maxLength={180}
              value={partner.parents}
              onChange={(event) =>
                onChange({
                  ...value,
                  partners: partners.map((item, i) => (i === index ? { ...item, parents: event.target.value } : item)),
                })
              }
            />
          </label>
        </fieldset>
      ))}
      <fieldset>
        <legend>Timeline hubungan</legend>
        {value.milestones?.map((moment) => {
          function update(patch: Partial<typeof moment>) {
            onChange({
              ...value,
              milestones: value.milestones?.map((item) => (item.id === moment.id ? { ...item, ...patch } : item)),
            })
          }
          return (
            <fieldset key={moment.id}>
              <legend>{moment.title || 'Momen baru'}</legend>
              <label>
                Tanggal <input type="date" value={moment.date} onChange={(e) => update({ date: e.target.value })} />
              </label>
              <label>
                Judul <input maxLength={120} value={moment.title} onChange={(e) => update({ title: e.target.value })} />
              </label>
              <label>
                Lokasi{' '}
                <input maxLength={160} value={moment.location} onChange={(e) => update({ location: e.target.value })} />
              </label>
              <label>
                Cerita{' '}
                <textarea maxLength={500} value={moment.story} onChange={(e) => update({ story: e.target.value })} />
              </label>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...value, milestones: value.milestones?.filter((item) => item.id !== moment.id) })
                }
              >
                Hapus momen
              </button>
            </fieldset>
          )
        })}
        <button
          type="button"
          disabled={(value.milestones?.length ?? 0) >= 8}
          onClick={() =>
            onChange({
              ...value,
              milestones: [
                ...(value.milestones ?? []),
                { id: crypto.randomUUID(), date: '', title: '', location: '', story: '' },
              ],
            })
          }
        >
          Tambah momen
        </button>
      </fieldset>
      <label>
        Kutipan atau ayat
        <textarea
          maxLength={500}
          value={value.quote ?? ''}
          onChange={(e) => onChange({ ...value, quote: e.target.value })}
        />
      </label>
      <label>
        Link live streaming
        <input
          type="url"
          maxLength={600}
          value={value.livestream ?? ''}
          onChange={(e) => onChange({ ...value, livestream: e.target.value })}
        />
      </label>
      <fieldset>
        <legend>Hadiah pernikahan</legend>
        {value.gifts?.map((gift, index) => {
          function update(patch: Partial<typeof gift>) {
            onChange({ ...value, gifts: value.gifts?.map((item, i) => (i === index ? { ...item, ...patch } : item)) })
          }
          return (
            <fieldset key={gift.id}>
              <legend>Rekening atau e-wallet {index + 1}</legend>
              <label>
                Label <input maxLength={80} value={gift.label} onChange={(e) => update({ label: e.target.value })} />
              </label>
              <label>
                Nomor{' '}
                <input maxLength={120} value={gift.account} onChange={(e) => update({ account: e.target.value })} />
              </label>
              <button
                type="button"
                onClick={() => onChange({ ...value, gifts: value.gifts?.filter((_, i) => i !== index) })}
              >
                Hapus rekening
              </button>
            </fieldset>
          )
        })}
        <button
          type="button"
          disabled={(value.gifts?.length ?? 0) >= 5}
          onClick={() =>
            onChange({
              ...value,
              gifts: [...(value.gifts ?? []), { id: crypto.randomUUID(), label: '', account: '' }],
            })
          }
        >
          Tambah rekening atau e-wallet
        </button>
      </fieldset>
    </details>
  )
}

export function displayWeddingDate(date: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

export function WeddingStoryExtras({ extras, backdrop }: { extras?: WeddingExtras; backdrop?: string }) {
  const partners = extras?.partners
    ?.map((partner, index) => ({ ...partner, key: index === 0 ? 'first' : 'second' }))
    .filter(({ name, parents }) => name.trim() || parents.trim())
  const milestones = extras?.milestones?.filter(({ title }) => title.trim())
  return (
    <>
      {!!partners?.length && (
        <div
          className="wedding-couple-profiles"
          style={
            backdrop ? { backgroundImage: `linear-gradient(#10171acf, #10171acf), url("${backdrop}")` } : undefined
          }
        >
          {partners.map(({ name, parents, key }) => (
            <div key={key}>
              <h4>{name}</h4>
              <p>{parents}</p>
            </div>
          ))}
        </div>
      )}
      {!!milestones?.length && (
        <ol className="wedding-story-timeline">
          {milestones.map((moment) => (
            <li key={moment.id}>
              {moment.date && <time dateTime={moment.date}>{displayWeddingDate(moment.date)}</time>}
              <h4>{moment.title}</h4>
              {moment.location && <p>{moment.location}</p>}
              {moment.story && <p>{moment.story}</p>}
            </li>
          ))}
        </ol>
      )}
      {extras?.quote?.trim() && <blockquote>{extras.quote}</blockquote>}
    </>
  )
}

function CopyGift({ label, account }: { label: string; account: string }) {
  const [status, setStatus] = useState('')
  return (
    <details>
      <summary>{label || 'Rekening'}</summary>
      <p>{account}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(account)
            setStatus('Nomor disalin.')
          } catch {
            setStatus('Salin nomor dari teks di atas.')
          }
        }}
      >
        Salin nomor
      </button>
      <span role="status">{status}</span>
    </details>
  )
}

export function WeddingEventExtras({ extras }: { extras?: WeddingExtras }) {
  const gifts = extras?.gifts?.filter(({ account }) => account.trim())
  const stream = extras?.livestream
  return (
    <>
      {stream && /^https?:\/\//i.test(stream) && (
        <a href={stream} target="_blank" rel="noreferrer">
          Buka live streaming
        </a>
      )}
      {!!gifts?.length && (
        <div className="wedding-gift-links">
          <h4>Hadiah pernikahan</h4>
          {gifts.map((gift) => (
            <CopyGift key={gift.id} {...gift} />
          ))}
        </div>
      )}
    </>
  )
}

const decorationPositions = [8, 19, 33, 46, 58, 72, 85, 95]

export function WeddingDecoration({ choice }: { choice?: 'plain' | 'petals' | 'stars' }) {
  if (!choice || choice === 'plain') return null
  return (
    <div className="wedding-decoration" aria-hidden="true">
      {decorationPositions.map((left, index) => (
        <span key={left} style={{ left: `${left}%`, animationDelay: `-${index * 1.6}s` }}>
          {choice === 'stars' ? '✦' : '❧'}
        </span>
      ))}
    </div>
  )
}
