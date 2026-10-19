interface AvatarStackProps {
  urls: string[]
  max?: number
  size?: number
}

export function AvatarStack({ urls, max = 4, size = 28 }: AvatarStackProps) {
  const shown = urls.slice(0, max)
  return (
    <div className="flex items-center">
      {shown.map((url, i) => (
        <img
          key={`${url}-${i}`}
          src={url}
          alt=""
          width={size}
          height={size}
          className="rounded-full border-2 border-card object-cover bg-card-elevated"
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
        />
      ))}
    </div>
  )
}
