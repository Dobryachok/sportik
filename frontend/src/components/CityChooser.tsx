import { LocateFixed, MapPin, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAppData } from '../app/AppDataContext'
import { reverseGeocode } from '../data/api'

/** City is an explicit choice. Browser coordinates are used once and never stored. */
export function CityChooser() {
  const { city, setCity } = useAppData()
  const [open, setOpen] = useState(() => !city)
  const [value, setValue] = useState(city)
  const [message, setMessage] = useState('')
  const [locating, setLocating] = useState(false)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (await setCity(value)) {
      setOpen(false)
      setMessage('')
    } else {
      setMessage('Не удалось выбрать город. Попробуйте ещё раз.')
    }
  }

  const locate = () => {
    if (!window.isSecureContext) {
      setMessage('Для геолокации нужен HTTPS или localhost. Введите город вручную.')
      return
    }
    if (!navigator.geolocation) {
      setMessage('Геолокация недоступна. Введите город вручную.')
      return
    }
    setLocating(true)
    setMessage('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const result = await reverseGeocode(coords.latitude, coords.longitude)
          setValue(result.city)
          if (await setCity(result.city)) setOpen(false)
          else setMessage('Не удалось загрузить события. Введите город вручную.')
        } catch {
          setMessage('Не удалось определить город. Введите его вручную.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setMessage('Доступ к геолокации не предоставлен. Введите город вручную.')
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false },
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setValue(city); setOpen(true) }}
        className="flex shrink-0 items-center gap-1 text-sm text-accent"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MapPin size={18} />{city || 'Выбрать город'}
      </button>
      {open && (
        <div role="dialog" aria-label="Выбор города" className="absolute right-0 top-9 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-card p-4 shadow-2xl ring-1 ring-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Где показать события?</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть"><X size={19} /></button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted">
            Укажите город или разрешите геолокацию. Координаты передаются сервису определения города, но не сохраняются в профиле или базе.
          </p>
          <form onSubmit={save}>
            <label className="block text-sm text-muted">
              Город
              <input required value={value} onChange={(event) => setValue(event.target.value)} placeholder="Например, Омск" className="mt-1 w-full rounded-xl bg-bg px-3 py-2.5 text-white outline-none ring-accent focus:ring-1" />
            </label>
            <button className="mt-3 w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold" type="submit">Показать события</button>
          </form>
          <button type="button" disabled={locating} onClick={locate} className="mt-3 flex w-full items-center justify-center gap-2 text-sm text-accent disabled:opacity-60">
            <LocateFixed size={17} />{locating ? 'Определяем…' : 'Определить по геолокации'}
          </button>
          {message && <p role="status" className="mt-3 text-xs leading-relaxed text-warning">{message}</p>}
        </div>
      )}
    </div>
  )
}
