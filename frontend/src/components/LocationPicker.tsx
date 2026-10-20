import { LoaderCircle, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { suggestAddresses } from '../data/api'
import type { LocationSuggestion } from '../data/types'

interface LocationPickerProps {
  address: string
  city: string
  district: string
  latitude?: number
  longitude?: number
  onChange: (location: { address: string; city: string; district: string; latitude?: number; longitude?: number }) => void
  required?: boolean
}

export function LocationPicker({ address, city, district, latitude, longitude, onChange, required = false }: LocationPickerProps) {
  const verified = latitude != null && longitude != null
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [addressNotFound, setAddressNotFound] = useState(false)
  const latestRequest = useRef(0)

  useEffect(() => {
    const query = address.trim()
    if (query.length < 3) {
      setSuggestions([])
      setLoading(false)
      setAddressNotFound(false)
      return
    }
    const requestId = ++latestRequest.current
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setAddressNotFound(false)
      void suggestAddresses(query, city, controller.signal)
        .then((items) => {
          if (requestId === latestRequest.current) {
            setSuggestions(items)
            setAddressNotFound(items.length === 0)
            setOpen(true)
          }
        })
        .catch(() => {
          if (requestId === latestRequest.current) {
            setSuggestions([])
            setAddressNotFound(false)
          }
        })
        .finally(() => {
          if (requestId === latestRequest.current) setLoading(false)
        })
    }, 350)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [address, city])

  const choose = (item: LocationSuggestion) => {
    onChange({
      address: item.address,
      city,
      district: item.district,
      latitude: item.latitude,
      longitude: item.longitude,
    })
    setSuggestions([])
    setOpen(false)
    setAddressNotFound(false)
  }

  const displayAddress = verified ? address : address

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-white/85">
        Адрес
        <div className="relative mt-1.5">
          <MapPin size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-accent" />
          <input
            required={required}
            maxLength={255}
            value={address}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onChange={(event) => onChange({ address: event.target.value, city, district, latitude: undefined, longitude: undefined })}
            placeholder="Начните вводить адрес"
            autoComplete="street-address"
            className="w-full rounded-xl border border-white/10 bg-bg py-3 pl-10 pr-10 text-white outline-none transition-colors focus:border-accent"
          />
          {loading && <LoaderCircle size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted" aria-label="Ищем адрес" />}
        </div>
      </label>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#20252a] p-1.5 shadow-2xl">
          {suggestions.map((item) => (
            <li key={`${item.latitude}:${item.longitude}:${item.label}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/[0.08]"
              >
                <span className="block font-medium">{item.address}</span>
                <span className="mt-0.5 block text-xs text-muted">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && addressNotFound && address.trim().length >= 3 && !verified && (
        <p className="mt-1.5 text-xs text-warning" role="alert">
          Адрес не найден. Проверьте правильность написания.
        </p>
      )}
      <p className="mt-1.5 text-xs text-muted">
        {verified ? (
          <>
            Адрес подтверждён: <span className="text-white/90">{displayAddress}</span>
          </>
        ) : (
          'Выберите адрес из подсказки — без этого событие не сохранится.'
        )}
      </p>
    </div>
  )
}
