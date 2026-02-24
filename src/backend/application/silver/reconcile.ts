import { computeTokenOverlap } from "../../domain/matching";
import type {
  SilverDataQualityEventRow,
  SilverIngredientCanonicalRow,
  SilverIngredientRawRow,
  SilverPdfLineRow,
  SilverReconcileResultRow,
  TransformContext,
} from "./types";

interface ReconcileResult {
  results: SilverReconcileResultRow[];
  qualityEvents: SilverDataQualityEventRow[];
}

export const reconcileComputedIngredientsWithPdf = (
  context: TransformContext,
  weekId: string,
  rawRows: SilverIngredientRawRow[],
  canonicalRows: SilverIngredientCanonicalRow[],
  pdfRows: SilverPdfLineRow[],
): ReconcileResult => {
  const results: SilverReconcileResultRow[] = [];
  const qualityEvents: SilverDataQualityEventRow[] = [];

  const canonicalByRawId = new Map(canonicalRows.map((row) => [row.rawId, row]));

  for (const rawRow of rawRows) {
    const canonical = canonicalByRawId.get(rawRow.rawId);
    const matchTarget = canonical?.canonicalName ?? rawRow.ingredientText;
    const overlapScores = pdfRows.map((pdf) => computeTokenOverlap(matchTarget, pdf.lineText));
    const hasFullMatch = overlapScores.some((score) => score >= 1);
    const hasPartial = !hasFullMatch && overlapScores.some((score) => score > 0);

    let status: SilverReconcileResultRow["reconcileStatus"] = "missing_in_pdf";
    let note = "No matching PDF line found.";
    if (hasFullMatch) {
      status = "matched";
      note = "Exact token match in PDF lines.";
    } else if (hasPartial) {
      status = "partial";
      note = "Partial token overlap found in PDF lines.";
    }

    const reconcileId = `${rawRow.rawId}:reconcile`;
    results.push({
      reconcileId,
      weekId,
      rawId: rawRow.rawId,
      reconcileStatus: status,
      note,
      sourceObjectId: context.sourceObjectId,
      transformVersion: context.transformVersion,
    });

    if (status !== "matched") {
      qualityEvents.push({
        eventId: `${reconcileId}:quality`,
        severity: status === "partial" ? "warning" : "error",
        category: "reconcile",
        message: `${matchTarget} -> ${status}`,
        sourceObjectId: context.sourceObjectId,
        transformVersion: context.transformVersion,
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (rawRows.length === 0 && pdfRows.length > 0) {
    qualityEvents.push({
      eventId: `${weekId}:missing-computed`,
      severity: "warning",
      category: "reconcile",
      message: "PDF lines available but no computed ingredient rows found.",
      sourceObjectId: context.sourceObjectId,
      transformVersion: context.transformVersion,
      createdAt: new Date().toISOString(),
    });
  }

  return { results, qualityEvents };
};
