import { useEffect, useState } from 'react';
import {
  parseReportDraft,
  REPORT_SECTIONS,
  type ReportDraft,
} from '../../../application/reporting/ReportDraft';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { ReportChartConfiguration } from '../../../domain/reporting/ReportChartConfiguration';
import { MatchPdfRenderer } from '../../../infrastructure/export/pdf/MatchPdfRenderer';
import { matchPdfPreviewPages } from '../../../infrastructure/export/pdf/MatchPdfPreview';
import { reportDraftStorageKey } from './reportDraftStorage';
import './ReportEditor.css';

interface ReportEditorProps {
  readonly report: MatchReportModel;
  readonly charts: readonly ReportChartConfiguration[];
  readonly draft: ReportDraft;
  readonly onChange: (draft: ReportDraft) => void;
  readonly onExport: () => Promise<void>;
  readonly busy: boolean;
  readonly onManageCharts: () => void;
}

export function ReportEditor({
  report,
  charts,
  draft,
  onChange,
  onExport,
  busy,
  onManageCharts,
}: ReportEditorProps) {
  const [preview, setPreview] = useState<string>();
  const [previewPages, setPreviewPages] = useState<readonly string[]>([]);
  const [notice, setNotice] = useState('');
  const [previewError, setPreviewError] = useState('');
  useEffect(() => {
    let url: string | undefined;
    const timer = window.setTimeout(() => {
      try {
        const pdf = new MatchPdfRenderer().render(report, charts, undefined, draft);
        url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
        setPreview(url);
        setPreviewPages(matchPdfPreviewPages(pdf));
        setPreviewError('');
      } catch {
        setPreviewError('Não foi possível atualizar a prévia. Tente novamente.');
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [report, charts, draft]);

  function update(next: ReportDraft) {
    onChange(next);
    try {
      localStorage.setItem(reportDraftStorageKey(report.metadata.id), JSON.stringify(next));
      setNotice('Rascunho salvo neste dispositivo.');
    } catch {
      setNotice(
        'Não foi possível salvar neste dispositivo. Baixe o rascunho para guardar suas alterações.',
      );
    }
  }

  function downloadDraft() {
    const content = JSON.stringify(
      { kind: 'scout-trainer-report-draft', version: 1, matchId: report.metadata.id, draft },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'relatorio-rascunho.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importDraft(file?: File) {
    if (!file) return;
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== 'object') throw new Error('Arquivo de rascunho inválido.');
      const data = value as Record<string, unknown>;
      const parsed = parseReportDraft(data.draft);
      if (data.kind !== 'scout-trainer-report-draft' || data.version !== 1 || !parsed)
        throw new Error('Arquivo de rascunho inválido.');
      if (data.matchId !== report.metadata.id)
        throw new Error('Este rascunho pertence a outra partida. Abra a partida correspondente.');
      update(parsed);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível abrir o rascunho.');
    }
  }

  return (
    <section className="report-editor" aria-labelledby="report-editor-title">
      <div className="report-editor-heading">
        <div>
          <p className="eyebrow">Relatório da partida</p>
          <h2 id="report-editor-title">Editar e gerar relatório</h2>
          <p>Personalize o conteúdo, confira a prévia e gere o PDF.</p>
        </div>
        <button
          className="button primary"
          type="button"
          disabled={busy}
          onClick={() => void onExport()}
        >
          Gerar PDF
        </button>
      </div>
      <div className="report-editor-layout">
        <div className="report-editor-controls">
          <label>
            Título do relatório
            <input
              value={draft.title}
              maxLength={120}
              onChange={(event) => update({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            Subtítulo
            <input
              value={draft.subtitle}
              maxLength={180}
              onChange={(event) => update({ ...draft, subtitle: event.target.value })}
            />
          </label>
          <label>
            Responsável pela análise
            <input
              value={draft.author}
              maxLength={100}
              placeholder="Nome do analista ou comissão técnica"
              onChange={(event) => update({ ...draft, author: event.target.value })}
            />
          </label>
          <label>
            Observações da análise
            <textarea
              rows={6}
              value={draft.notes}
              maxLength={12000}
              placeholder="Destaques, ajustes e recomendações para a equipe…"
              onChange={(event) => update({ ...draft, notes: event.target.value })}
            />
          </label>
          <fieldset>
            <legend>Seções do relatório</legend>
            {REPORT_SECTIONS.map((section) => (
              <label className="report-section-option" key={section.id}>
                <input
                  type="checkbox"
                  checked={draft.sections.includes(section.id)}
                  disabled={section.id === 'charts'}
                  onChange={(event) =>
                    update({
                      ...draft,
                      sections: event.target.checked
                        ? [...draft.sections, section.id]
                        : draft.sections.filter((id) => id !== section.id),
                    })
                  }
                />
                <span>
                  {section.label}
                  {section.id === 'charts' ? ` (${charts.length})` : ''}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="report-selected-charts">
            <strong>{charts.length} gráficos no relatório</strong>
            {charts.length ? (
              <ol>
                {[...charts]
                  .sort((a, b) => a.order - b.order)
                  .map((chart) => (
                    <li key={chart.id}>{chart.title}</li>
                  ))}
              </ol>
            ) : (
              <p>Escolha os gráficos na tela Análise para montar seu relatório.</p>
            )}
            <button className="button secondary" type="button" onClick={onManageCharts}>
              Escolher e organizar gráficos
            </button>
          </div>
          <p className="report-editor-help">
            O PDF inclui os gráficos selecionados na tela Análise, com seus títulos, filtros e
            ordem.
          </p>
          <div className="report-draft-actions">
            <button className="button secondary" type="button" onClick={downloadDraft}>
              Baixar rascunho
            </button>
            <label className="button ghost">
              Abrir rascunho
              <input
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  void importDraft(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="report-editor-help" role="status">
            {notice || 'Você pode voltar a este editor para alterar o relatório e gerar novamente.'}
          </p>
        </div>
        <div className="report-preview">
          <div className="report-preview-heading">
            <span>Prévia do PDF · {previewPages.length} páginas</span>
            {preview && (
              <a href={preview} target="_blank" rel="noreferrer">
                Abrir em outra aba ↗
              </a>
            )}
          </div>
          {previewError ? (
            <p role="alert">{previewError}</p>
          ) : preview ? (
            <div className="report-preview-pages" aria-label="Prévia do relatório PDF" tabIndex={0}>
              {previewPages.map((svg, index) => (
                <img
                  key={index}
                  alt={`Página ${index + 1} do relatório`}
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                  width={595}
                  height={842}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          ) : (
            <p role="status">Preparando prévia…</p>
          )}
        </div>
      </div>
    </section>
  );
}
