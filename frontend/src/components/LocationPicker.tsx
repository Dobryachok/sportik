import { LoaderCircle, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ApiError, suggestAddresses } from '../data/api'
import type { LocationSuggestion } from '../data/types'

interface LocationPickerProps {
  address: string
  city: string
  district: string
  latitude?: number
  longitude?: number
  onChange: (location: { address: string; city: string; district: string; latitude?: number; longitude?: number }) => void
  required?: boolean
  /** Keep the event city from the form; geocoder only supplies street and coordinates. */
  lockCity?: boolean
}

export function LocationPicker({
  address,
  city,
  district,
  latitude,
  longitude,
  onChange,
  required = false,
  lockCity = false,
}: LocationPickerProps) {
  const verified = latitude != null && longitude != null
  const cityReady = city.trim().length > 0
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [addressNotFound, setAddressNotFound] = useState(false)
  const [serviceError, setServiceError] = useState('')
  const latestRequest = useRef(0)

  useEffect(() => {
    const query = address.trim()
    if (!cityReady || query.length < 3) {
      setSuggestions([])
      setLoading(false)
      setAddressNotFound(false)
      setServiceError('')
      return
    }
    const requestId = ++latestRequest.current
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setAddressNotFound(false)
      setServiceError('')
      void suggestAddresses(query, city, controller.signal)
        .then((items) => {
          if (requestId === latestRequest.current) {
            setSuggestions(items)
            setAddressNotFound(items.length === 0)
            setOpen(true)
          }
        })
        .catch((cause) => {
          if (requestId === latestRequest.current) {
            setSuggestions([])
            setAddressNotFound(false)
            if (cause instanceof ApiError && cause.status === 503) {
              setServiceError('Подсказки адресов временно недоступны. Проверьте настройку геокодера на сервере.')
            } else if (cause instanceof ApiError && cause.status === 429) {
              setServiceError('Слишком много запросов. Подождите секунду и продолжите ввод.')
            } else {
              setServiceError('Не удалось получить подсказки. Попробуйте ещё раз.')
            }
          }
        })
        .finally(() => {
          if (requestId === latestRequest.current) setLoading(false)
        })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [address, city, cityReady])

  const choose = (item: LocationSuggestion) => {
    const normalized = item.label.trim() || item.address.trim()
    onChange({
      address: normalized.length > 255 ? normalized.slice(0, 255) : normalized,
      city: lockCity ? city : item.city || city,
      district: item.district,
      latitude: item.latitude,
      longitude: item.longitude,
    })
    setSuggestions([])
    setOpen(false)
    setAddressNotFound(false)
    setServiceError('')
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-white/85">
        Адрес
        {cityReady && (
          <span className="mt-0.5 block text-xs font-normal text-muted">
            Поиск в городе: <span className="text-white/90">{city}</span>
          </span>
        )}
        <div className="relative mt-1.5">
          <MapPin size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-accent" />
          <input
            required={required}
            disabled={!cityReady}
            maxLength={255}
            value={address}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onChange={(event) =>
              onChange({
                address: event.target.value,
                city,
                district,
                latitude: undefined,
                longitude: undefined,
              })
            }
            placeholder={cityReady ? 'Улица, дом, площадка…' : 'Сначала выберите город события'}
            autoComplete="off"
            className="w-full rounded-xl border border-white/10 bg-bg py-3 pl-10 pr-10 text-white outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          />
          {loading && <LoaderCircle size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted" aria-label="Ищем адрес" />}
        </div>
      </label>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#20252a] p-1.5 shadow-2xl">
          {suggestions.map((item) => (
            <li key={`${item.latitude}:${item.longitude}:${item.label}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/[0.08]"
              >
                <span className="block font-medium leading-snug">{item.label}</span>
                {item.address && item.address !== item.label && (
                  <span className="mt-0.5 block text-xs text-muted">{item.address}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && addressNotFound && address.trim().length >= 3 && cityReady && !verified && (
        <p className="mt-1.5 text-xs text-warning" role="alert">
          Адрес не найден. Уточните улицу и номер дома или выберите вариант из списка.
        </p>
      )}
      {serviceError && (
        <p className="mt-1.5 text-xs text-warning" role="alert">
          {serviceError}
        </p>
      )}
      <p className="mt-1.5 text-xs text-muted">
        {verified
          ? 'Адрес подтверждён на карте — координаты сохранятся вместе с событием.'
          : cityReady
            ? 'Начните вводить адрес и выберите подсказку, как в навигаторе. Без выбора из списка событие не сохранится.'
            : 'Выберите город выше, затем введите адрес.'}
      </p>
    </div>
  )
}
