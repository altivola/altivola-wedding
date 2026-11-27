import { type Collection, type ThemeId, themes } from '@app/api/invitation-model'
import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ThemeThumb } from './theme-thumb'
import './site.css'

const collectionLabels: Record<Collection | 'all', string> = {
  all: 'Semua',
  klasik: 'Klasik',
  ilustrasi: 'Ilustrasi',
  ceria: 'Ceria',
}

type Sort = 'rekomendasi' | 'nama'

export function ThemeFilters({
  collection,
  setCollection,
  query,
  setQuery,
  sort,
  setSort,
}: {
  collection: Collection | 'all'
  setCollection: (value: Collection | 'all') => void
  query: string
  setQuery: (value: string) => void
  sort: Sort
  setSort: (value: Sort) => void
}) {
  return (
    <div className="theme-filters">
      <fieldset className="theme-chips">
        <legend className="sr-only">Koleksi</legend>
        {(Object.keys(collectionLabels) as (Collection | 'all')[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`chip ${collection === value ? 'is-on' : ''}`}
            aria-pressed={collection === value}
            onClick={() => setCollection(value)}
          >
            {collectionLabels[value]}
            <span className="chip-count">
              {value === 'all' ? themes.length : themes.filter((theme) => theme.collection === value).length}
            </span>
          </button>
        ))}
      </fieldset>
      <div className="theme-search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari tema"
          aria-label="Cari tema"
        />
        <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Urutkan">
          <option value="rekomendasi">Urutkan: rekomendasi</option>
          <option value="nama">Urutkan: nama</option>
        </select>
      </div>
    </div>
  )
}

export function useThemeFilter() {
  const [collection, setCollection] = useState<Collection | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('rekomendasi')
  const list = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = themes.filter(
      (theme) =>
        (collection === 'all' || theme.collection === collection) &&
        (!needle || `${theme.name} ${theme.blurb.id} ${theme.collection}`.toLowerCase().includes(needle)),
    )
    return sort === 'nama' ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : filtered
  }, [collection, query, sort])
  return { list, filters: { collection, setCollection, query, setQuery, sort, setSort } }
}

export function ThemeCard({
  theme,
  action,
}: {
  theme: (typeof themes)[number]
  action?: { label: string; onClick: () => void; selected?: boolean }
}) {
  return (
    <article className={`theme-card ${action?.selected ? 'is-selected' : ''}`}>
      <div className="theme-card-art">
        <ThemeThumb theme={theme.id as ThemeId} />
        <span className="theme-card-tag">{collectionLabels[theme.collection]}</span>
      </div>
      <div className="theme-card-body">
        <h3>{theme.name}</h3>
        <p>{theme.blurb.id}</p>
        <div className="theme-card-actions">
          <Link to="/tema/$theme" params={{ theme: theme.id }} className="site-button is-ghost">
            Pratinjau
          </Link>
          {action ? (
            <button type="button" className="site-button is-dark" onClick={action.onClick}>
              {action.label}
            </button>
          ) : (
            <Link to="/buat" search={{ tema: theme.id }} className="site-button is-dark">
              Pakai tema
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
