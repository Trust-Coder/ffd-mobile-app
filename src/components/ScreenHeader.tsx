interface Props {
  title: string
  subtitle?: string
}

export default function ScreenHeader({ title, subtitle }: Props) {
  return (
    <header className="screen-header">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  )
}
