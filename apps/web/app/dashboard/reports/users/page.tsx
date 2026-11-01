import UsersReportClient from './UsersReportClient'

const asList = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v])

// ?belt=<key>&belt=<key>&degree=2 — a shareable "blue + purple belts" view
export default async function UsersReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  return (
    <UsersReportClient
      initialFilters={{
        belts: asList(sp.belt).filter(Boolean),
        degrees: asList(sp.degree).map(Number).filter(n => Number.isInteger(n) && n >= 0),
      }}
    />
  )
}
