export default function Page({ title, note }: { title: string; note: string }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="muted">{note}</p>
    </>
  )
}
