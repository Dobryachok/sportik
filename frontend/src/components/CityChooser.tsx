import { LocateFixed, MapPin, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppData } from '../app/AppDataContext'
import { reverseGeocode } from '../data/api'

const CITY_OPTIONS = [
  'Красноярск',
  'Абакан',
  'Барнаул',
  'Иркутск',
  'Кемерово',
  'Новокузнецк',
  'Новосибирск',
  'Омск',
  'Томск',
]

interface CityChooserProps {
  /** When provided, the chooser controls an event location rather than the global feed city. */
  value?: string
  onChange?: (city: string) => void
  label?: string
}

/** City is chosen from a fixed list. Browser coordinates are used once and never stored. */
export function CityChooser({ value, onChange, label = 'Город' }: CityChooserProps) {
  const { city, setCity } = useAppData()
  const selectedCity = value ?? city
  const [open, setOpen] = useState(() => !selectedCity)
  const [message, setMessage] = useState('')
  const [locating, setLocating] = useState(false)
  const options = useMemo(
    () => Array.from(new Set([...CITY_OPTIONS, selectedCity].filter(Boolean))).sort((left, right) => left.localeCompare(right, 'ru')),
    [selectedCity],
  )

  const selectCity = async (nextCity: string) => {
    setMessage('')
    if (onChange) {
      onChange(nextCity)
      setOpen(false)
      return
    }
    if (await setCity(nextCity)) setOpen(false)
    else setMessage('Не удалось загрузить события. Попробуйте выбрать город ещё раз.')
  }

  const locate = () => {
    if (!window.isSecureContext) {
      setMessage('Для геолокации нужен HTTPS или localhost. Выберите город из списка.')
      return
    }
    if (!navigator.geolocation) {
      setMessage('Геолокация недоступна. Выберите город из списка.')
      return
    }
    setLocating(true)
    setMessage('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const result = await reverseGeocode(coords.latitude, coords.longitude)
          await selectCity(result.city)
        } catch {
          setMessage('Не удалось определить город. Выберите его из списка.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setMessage('Доступ к геолокации не предоставлен. Выберите город из списка.')
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MapPin size={16} className="text-accent" />
        <span className="max-w-28 truncate">{selectedCity || label}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Выбор города"
          className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[1.35rem] border border-white/10 bg-card p-4 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-bold">Выберите город</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/[0.08] hover:text-white">
              <X size={19} />
            </button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted">Города выбираются из списка. Геолокация только определяет подходящий вариант и не сохраняется.</p>
          <label className="block text-sm font-medium text-white/80">
            {label}
            <select
              value={selectedCity}
              onChange={(event) => void selectCity(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-bg px-3 py-3 text-white outline-none transition-colors focus:border-accent"
            >
              {!selectedCity && <option value="" disabled>Выберите город</option>}
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button type="button" disabled={locating} onClick={locate} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-60">
            <LocateFixed size={17} />
            {locating ? 'Определяем…' : 'Определить по геолокации'}
          </button>
          {message && <p role="status" className="mt-3 text-xs leading-relaxed text-warning">{message}</p>}
        </div>
      )}
    </div>
  )
}
