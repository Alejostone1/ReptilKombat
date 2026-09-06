import { HabilidadesClient } from "./HabilidadesClient";

export default async function HabilidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ buscar?: string }>;
}) {
  const { buscar } = await searchParams;
  return <HabilidadesClient initialQuery={buscar ?? ""} />;
}
