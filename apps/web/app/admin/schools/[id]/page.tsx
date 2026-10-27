import SchoolOverviewClient from './SchoolOverviewClient'

export default async function SchoolOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchoolOverviewClient schoolId={id} />
}
