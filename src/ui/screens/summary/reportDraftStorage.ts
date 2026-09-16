import { createReportDraft, parseReportDraft, type ReportDraft } from '../../../application/reporting/ReportDraft';

export const reportDraftStorageKey = (matchId: string) => `scout-trainer:report-draft:${matchId}`;

export function loadReportDraft(matchId: string): ReportDraft {
  try {
    return parseReportDraft(JSON.parse(localStorage.getItem(reportDraftStorageKey(matchId)) ?? 'null')) ?? createReportDraft();
  } catch {
    return createReportDraft();
  }
}
