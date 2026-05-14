import { redirect } from 'next/navigation'

/** Oude URL: vragen staan op `/peek`, niet op `/generate` (dat klinkt naar de API). */
export default async function LegacyGenerateRedirect({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  redirect(`/lobby/${code}/peek`)
}
