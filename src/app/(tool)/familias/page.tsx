import { FamiliasClient } from "./FamiliasClient";

export default async function FamiliasPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  const { familia } = await searchParams;
  return <FamiliasClient initialQuery={familia ?? ""} />;
}
