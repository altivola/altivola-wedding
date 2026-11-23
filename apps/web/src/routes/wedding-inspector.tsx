import type { SectionStyle, StudioSection, WeddingDesign } from '@app/api/wedding-design'

export const studioLabels: Record<StudioSection, string> = {
  cover: 'Sampul',
  story: 'Cerita pasangan',
  event: 'Jadwal dan lokasi',
  album: 'Album foto',
  note: 'Pesan tambahan',
  rsvp: 'RSVP',
}

export const sectionTitles: Record<StudioSection, string> = {
  cover: '',
  story: 'Cerita kami',
  event: 'Hari pernikahan',
  album: 'Album kami',
  note: '',
  rsvp: 'Konfirmasi kehadiran',
}

const layouts = [
  ['stack', 'Bertumpuk'],
  ['editorial', 'Dua kolom'],
  ['framed', 'Berkartu'],
] as const
const alignments = [
  ['left', 'Kiri'],
  ['center', 'Tengah'],
  ['right', 'Kanan'],
] as const
const fonts = [
  ['serif', 'Serif'],
  ['sans', 'Sans'],
  ['italic', 'Serif miring'],
] as const

export function SectionInspector({
  section,
  design,
  onChange,
}: {
  section: StudioSection
  design: WeddingDesign
  onChange: (value: WeddingDesign) => void
}) {
  const value = design.sectionStyles?.[section] ?? {}
  function update<K extends keyof SectionStyle>(key: K, field: SectionStyle[K]) {
    onChange({ ...design, sectionStyles: { ...design.sectionStyles, [section]: { ...value, [key]: field } } })
  }
  function reset() {
    const sectionStyles = { ...design.sectionStyles }
    delete sectionStyles[section]
    onChange({ ...design, sectionStyles })
  }

  return (
    <section className="studio-inspector" aria-label={`Pengaturan ${studioLabels[section]}`}>
      <h3>{studioLabels[section]}</h3>
      <label>
        Label kecil
        <input maxLength={100} value={value.eyebrow ?? ''} onChange={(e) => update('eyebrow', e.target.value)} />
      </label>
      <label>
        {section === 'cover' ? 'Judul sampul' : 'Judul bagian'}
        <input
          maxLength={120}
          placeholder={section === 'cover' ? 'Nama pasangan' : sectionTitles[section]}
          value={value.title ?? ''}
          onChange={(e) => update('title', e.target.value)}
        />
      </label>
      <label>
        {section === 'cover' ? 'Sapaan' : 'Teks pembuka'}
        <textarea
          maxLength={500}
          placeholder={section === 'cover' ? 'Yth. {tamu}' : 'Tulis pengantar bagian ini'}
          value={value.lead ?? ''}
          onChange={(e) => update('lead', e.target.value)}
        />
      </label>
      <div className="inspector-grid">
        {section !== 'cover' && (
          <label>
            Susunan bagian
            <select
              value={value.layout ?? 'stack'}
              onChange={(e) => update('layout', layouts.find(([id]) => id === e.target.value)?.[0])}
            >
              {layouts.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Tipografi bagian
          <select
            value={value.font ?? ''}
            onChange={(e) => update('font', fonts.find(([id]) => id === e.target.value)?.[0])}
          >
            <option value="">Ikuti tema</option>
            {fonts.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rata teks
          <select
            value={value.align ?? (section === 'cover' ? 'center' : (design.sectionAlign?.[section] ?? 'center'))}
            onChange={(e) => update('align', alignments.find(([id]) => id === e.target.value)?.[0])}
          >
            {alignments.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rata di HP
          <select
            value={value.mobileAlign ?? ''}
            onChange={(e) => update('mobileAlign', alignments.find(([id]) => id === e.target.value)?.[0])}
          >
            <option value="">Ikuti desktop</option>
            {alignments.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Warna bidang
          <input type="color" value={value.surface ?? '#f9eedb'} onChange={(e) => update('surface', e.target.value)} />
        </label>
        <label>
          Warna teks
          <input type="color" value={value.ink ?? '#332a25'} onChange={(e) => update('ink', e.target.value)} />
        </label>
      </div>
      <label>
        Ukuran judul · {value.titleScale ?? 100}%
        <input
          type="range"
          min={65}
          max={160}
          value={value.titleScale ?? 100}
          onChange={(e) => update('titleScale', e.target.valueAsNumber)}
        />
      </label>
      <label>
        Ruang dalam · {value.spacing ?? 24}px
        <input
          type="range"
          min={8}
          max={88}
          value={value.spacing ?? 24}
          onChange={(e) => update('spacing', e.target.valueAsNumber)}
        />
      </label>
      <button className="inspector-reset" type="button" onClick={reset}>
        Reset bagian ini
      </button>
    </section>
  )
}
