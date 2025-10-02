import { HistoryEntryDetail } from "@/features/history/components/HistoryEntryDetail";

type HistoryEntryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function HistoryEntryPage({ params }: HistoryEntryPageProps) {
  const { id } = await params;
  return <HistoryEntryDetail entryId={id} />;
}
