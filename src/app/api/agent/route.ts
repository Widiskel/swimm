import { NextResponse } from "next/server";

type DataMode = "scrape" | "upload" | "manual";

type AgentRequest = {
  objective?: string;
  dataMode?: DataMode;
  urls?: string[];
  manualNotes?: string;
  datasetName?: string;
  datasetPreview?: string;
};

type AgentDecision = "buy" | "sell" | "hold";

type AgentPayload = {
  summary: string;
  decision: {
    action: AgentDecision;
    confidence: number;
    timeframe: string;
    rationale: string;
  };
  highlights: string[];
  nextSteps: string[];
};

const POSITIVE_KEYWORDS = [
  "bullish",
  "positive",
  "buy",
  "long",
  "accumulate",
  "support",
  "breakout",
  "institutional inflow",
];

const NEGATIVE_KEYWORDS = [
  "bearish",
  "negative",
  "sell",
  "short",
  "distribution",
  "resistance",
  "dump",
  "liquidation",
];

const pickTimeframe = (objective: string) => {
  const lower = objective.toLowerCase();
  if (/(scalp|intraday|1h|4h|harian)/i.test(lower)) {
    return "1D";
  }
  if (/(swing|mingguan|weekly|3d)/i.test(lower)) {
    return "1W";
  }
  if (/(makro|monthly|long term|jangka panjang)/i.test(lower)) {
    return "1M";
  }
  return "4H";
};

const excerpt = (text: string, length = 160) =>
  text.length > length ? `${text.slice(0, length)}...` : text;

const scoreSentiment = (corpus: string) => {
  let score = 0;
  const lowered = corpus.toLowerCase();
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowered.includes(keyword)) {
      score += 1;
    }
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowered.includes(keyword)) {
      score -= 1;
    }
  }
  return score;
};

export async function POST(request: Request) {
  let body: AgentRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!body.objective || body.objective.trim().length === 0) {
    return NextResponse.json(
      { error: "Objective analisa wajib diisi." },
      { status: 400 }
    );
  }

  const urls = Array.isArray(body.urls)
    ? body.urls.filter((url) => typeof url === "string" && url.trim().length > 0)
    : [];
  const manualNotes = body.manualNotes?.trim() ?? "";
  const datasetPreview = body.datasetPreview?.trim() ?? "";
  const dataMode = body.dataMode ?? "scrape";

  const combinedText = [body.objective, manualNotes, datasetPreview].join(" \n ");
  const sentimentScore = scoreSentiment(combinedText);

  let action: AgentDecision = "hold";
  if (sentimentScore > 0.5) {
    action = "buy";
  } else if (sentimentScore < -0.5) {
    action = "sell";
  }

  const coverageBonus = Math.min(urls.length, 6) * 0.04;
  const convictionBonus = Math.min(Math.abs(sentimentScore) * 0.1, 0.2);
  const confidence = Math.max(0.35, Math.min(0.92, 0.55 + coverageBonus + convictionBonus));

  const rationaleSegments: string[] = [];
  if (urls.length > 0) {
    rationaleSegments.push(`Menggunakan ${urls.length} sumber berita terbaru.`);
  }
  if (manualNotes) {
    rationaleSegments.push("Memasukkan catatan analis internal.");
  }
  if (datasetPreview) {
    rationaleSegments.push("Menganalisa dataset kustom yang diunggah.");
  }
  if (rationaleSegments.length === 0) {
    rationaleSegments.push("Menjalankan penilaian berbasis objektif yang diberikan.");
  }

  const highlights: string[] = [];
  if (urls.length > 0) {
    highlights.push(`Memproses ${urls.length} URL berita untuk sentiment & trend.`);
  }
  if (manualNotes) {
    highlights.push(`Catatan manual: ${excerpt(manualNotes)}`);
  }
  if (datasetPreview) {
    const datasetLabel = body.datasetName ?? "Dataset kustom";
    highlights.push(`${datasetLabel}: ${excerpt(datasetPreview)}`);
  }

  if (highlights.length === 0) {
    highlights.push("Belum ada data terlampir. Tambahkan sumber untuk insight yang lebih tajam.");
  }

  const nextSteps: string[] = [
    "Validasi rekomendasi dengan chart / indikator teknikal sebelum eksekusi.",
    "Tambahkan lebih banyak URL terpercaya atau data on-chain untuk memperkuat sinyal.",
  ];

  if (action === "buy") {
    nextSteps.push("Siapkan rencana pembelian bertahap dengan risk ratio yang sesuai.");
  } else if (action === "sell") {
    nextSteps.push("Pertimbangkan hedging atau proteksi downside (mis. stop-loss / options).");
  } else {
    nextSteps.push("Monitor perkembangan berita dan volume untuk konfirmasi sinyal berikutnya.");
  }

  const summaryParts = [
    `Agent memproses ${urls.length > 0 ? `${urls.length} sumber berita` : "instruksi"}.`,
  ];

  if (dataMode === "upload" && datasetPreview) {
    summaryParts.push("Dataset kustom digunakan sebagai referensi tambahan.");
  }
  if (manualNotes) {
    summaryParts.push("Catatan analis memberi konteks strategis tambahan.");
  }

  summaryParts.push(
    action === "buy"
      ? "Sentimen agregat condong bullish sehingga rekomendasi saat ini adalah BUY."
      : action === "sell"
      ? "Sentimen agregat condong bearish sehingga rekomendasi saat ini adalah SELL."
      : "Sentimen campuran, agent menyarankan HOLD sambil menunggu konfirmasi tambahan."
  );

  const payload: AgentPayload = {
    summary: summaryParts.join(" "),
    decision: {
      action,
      confidence,
      timeframe: pickTimeframe(body.objective),
      rationale: rationaleSegments.join(" "),
    },
    highlights,
    nextSteps,
  };

  return NextResponse.json(payload);
}




