import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FileQuestion, Loader2 } from "lucide-react";
import type { LibraryDocument } from "@/lib/domain/types";
import {
  readDocx,
  readPptx,
  readXlsx,
  parseCsv,
  type DocxModel,
  type PptxModel,
  type XlsxModel,
} from "@/lib/documents/ooxml";
import { formatBytes, formatDateTime } from "@/lib/domain/format";

type PreviewModel =
  | DocxModel
  | XlsxModel
  | PptxModel
  | { kind: "text"; text: string }
  | { kind: "csv"; rows: string[][] }
  | { kind: "json"; text: string };

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; model: PreviewModel };

const FALLBACK_EXTENSIONS = ["zip", "mp3", "wav", "m4a", "mp4", "mov", "ppt", "doc", "xls"];

export function DocumentPreview({ document }: { document: LibraryDocument }) {
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [sheetIndex, setSheetIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setSheetIndex(0);
    setSlideIndex(0);

    const load = async () => {
      if (!document.previewable) {
        setState({
          status: "error",
          message:
            "This file type has no in-workspace preview. Download it or open it in its original application.",
        });
        return;
      }
      try {
        if (document.kind === "pdf" || document.kind === "image") {
          if (!cancelled) setState({ status: "ready", model: { kind: "text", text: "" } });
          return;
        }
        const response = await fetch(document.path);
        if (!response.ok)
          throw new Error(`The file could not be loaded (HTTP ${response.status}).`);
        const buffer = await response.arrayBuffer();
        let model: PreviewModel;
        if (document.kind === "word") model = await readDocx(buffer);
        else if (document.kind === "excel") model = await readXlsx(buffer);
        else if (document.kind === "powerpoint") model = await readPptx(buffer);
        else {
          const text = await new Response(buffer).text();
          if (document.extension === "csv" || document.extension === "tsv")
            model = { kind: "csv", rows: parseCsv(text) };
          else if (document.extension === "json") model = { kind: "json", text };
          else model = { kind: "text", text };
        }
        if (!cancelled) setState({ status: "ready", model });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error ? error.message : "The document could not be previewed.",
          });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [document]);

  const header = (
    <div
      className="mx-tiny mx-muted"
      style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingBottom: 6 }}
    >
      <span>{formatBytes(document.bytes)}</span>
      <span>·</span>
      <span>{document.folder}</span>
      <span>·</span>
      <span>{formatDateTime(document.modifiedAt)}</span>
      <span>·</span>
      <span>{document.owner}</span>
      <a href={document.path} download className="mx-btn mx-btn--sm" style={{ marginLeft: "auto" }}>
        <Download /> Download
      </a>
    </div>
  );

  if (state.status === "loading") {
    return (
      <div>
        {header}
        <div className="mx-preview-placeholder">
          <Loader2
            className="mx-spin"
            style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }}
          />
          <span>Opening {document.name}…</span>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        {header}
        <div className="mx-preview-placeholder">
          {FALLBACK_EXTENSIONS.includes(document.extension) ? (
            <FileQuestion style={{ width: 22, height: 22 }} />
          ) : (
            <AlertTriangle style={{ width: 22, height: 22 }} />
          )}
          <strong>{document.name}</strong>
          <span>{state.message}</span>
          <a href={document.path} download className="mx-btn mx-btn--sm">
            <Download /> Download the file
          </a>
        </div>
      </div>
    );
  }

  const model = state.model;

  if (document.kind === "pdf") {
    return (
      <div>
        {header}
        <iframe src={document.path} title={document.name} />
      </div>
    );
  }

  if (document.kind === "image") {
    return (
      <div>
        {header}
        <img src={document.path} alt={document.name} />
      </div>
    );
  }

  if (model.kind === "docx") {
    return (
      <div>
        {header}
        <article style={{ display: "grid", gap: 6 }}>
          {model.blocks.map((block, index) => {
            if (block.type === "table") {
              return (
                <div className="mx-table-wrap" key={index}>
                  <table className="mx-table">
                    <tbody>
                      {block.rows?.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) =>
                            rowIndex === 0 ? (
                              <th key={cellIndex}>{cell}</th>
                            ) : (
                              <td key={cellIndex}>{cell}</td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            if (block.type === "heading") {
              return (
                <h3
                  key={index}
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: block.level === 0 ? 15 : 12,
                    color: "#1d4f7f",
                    marginTop: index === 0 ? 0 : 4,
                  }}
                >
                  {block.text}
                </h3>
              );
            }
            if (block.type === "bullet") {
              return (
                <div
                  key={index}
                  style={{ display: "grid", gridTemplateColumns: "10px minmax(0,1fr)", gap: 4 }}
                >
                  <span style={{ color: "#2a6eb0" }}>·</span>
                  <span>{block.text}</span>
                </div>
              );
            }
            return (
              <p key={index} style={{ margin: 0 }}>
                {block.text}
              </p>
            );
          })}
        </article>
      </div>
    );
  }

  if (model.kind === "xlsx") {
    const sheet = model.sheets[Math.min(sheetIndex, model.sheets.length - 1)];
    return (
      <div>
        {header}
        <div className="mx-inline" style={{ marginBottom: 6 }}>
          {model.sheets.map((entry, index) => (
            <button
              key={entry.name}
              className={`mx-btn mx-btn--sm${index === sheetIndex ? " mx-btn--primary" : ""}`}
              onClick={() => setSheetIndex(index)}
            >
              {entry.name}
            </button>
          ))}
          <span className="mx-tiny mx-muted">
            {sheet?.rows.length ?? 0} rows ·{" "}
            {Math.max(0, ...(sheet?.rows.map((row) => row.length) ?? [0]))} columns
          </span>
        </div>
        <div className="mx-table-wrap" style={{ maxHeight: 380 }}>
          <table className="mx-table mx-table--sheet">
            <tbody>
              {sheet?.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td
                    style={{
                      background: "rgba(232,242,253,.6)",
                      color: "#5f7d99",
                      fontSize: 8,
                      textAlign: "center",
                      width: 26,
                    }}
                  >
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, cellIndex) =>
                    rowIndex === 0 ? (
                      <th key={cellIndex}>{cell}</th>
                    ) : (
                      <td
                        key={cellIndex}
                        style={{ textAlign: /^[\d.,%-]+$/.test(cell) ? "right" : "left" }}
                      >
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (model.kind === "pptx") {
    const slide = model.slides[Math.min(slideIndex, model.slides.length - 1)];
    return (
      <div>
        {header}
        <div className="mx-inline" style={{ marginBottom: 6 }}>
          <button
            className="mx-btn mx-btn--sm"
            onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))}
            disabled={slideIndex === 0}
          >
            Previous
          </button>
          <span className="mx-tiny mx-muted">
            Slide {slideIndex + 1} of {model.slides.length}
          </span>
          <button
            className="mx-btn mx-btn--sm"
            onClick={() => setSlideIndex(Math.min(model.slides.length - 1, slideIndex + 1))}
            disabled={slideIndex >= model.slides.length - 1}
          >
            Next
          </button>
        </div>
        <div
          style={{
            border: "1px solid rgba(92,138,190,.3)",
            borderRadius: 10,
            background: "linear-gradient(160deg,#ffffff,#eef5fd)",
            padding: "14px 16px",
            minHeight: 190,
            display: "grid",
            alignContent: "start",
            gap: 8,
            boxShadow: "inset 0 1px 0 #fff",
          }}
        >
          <strong style={{ fontFamily: "Orbitron, sans-serif", fontSize: 13, color: "#1b4c78" }}>
            {slide?.title}
          </strong>
          <div style={{ display: "grid", gap: 5 }}>
            {slide?.lines.map((line, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "12px minmax(0,1fr)",
                  gap: 4,
                  fontSize: 10,
                }}
              >
                <span style={{ color: "#2a6eb0" }}>▪</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
        {slide?.notes ? (
          <div className="mx-note" style={{ marginTop: 6 }}>
            Speaker notes · {slide.notes}
          </div>
        ) : null}
        <div className="mx-inline" style={{ marginTop: 6 }}>
          {model.slides.map((entry, index) => (
            <button
              key={entry.index}
              className={`mx-btn mx-btn--sm${index === slideIndex ? " mx-btn--primary" : ""}`}
              onClick={() => setSlideIndex(index)}
              aria-label={`Go to slide ${entry.index}`}
            >
              {entry.index}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (model.kind === "csv") {
    return (
      <div>
        {header}
        <div className="mx-table-wrap" style={{ maxHeight: 380 }}>
          <table className="mx-table mx-table--sheet">
            <tbody>
              {model.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) =>
                    rowIndex === 0 ? (
                      <th key={cellIndex}>{cell}</th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (model.kind === "json") {
    return (
      <div>
        {header}
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, monospace",
            fontSize: 9.5,
            lineHeight: 1.5,
          }}
        >
          {model.text}
        </pre>
      </div>
    );
  }

  return (
    <div>
      {header}
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, monospace",
          fontSize: 9.5,
          lineHeight: 1.55,
        }}
      >
        {model.text}
      </pre>
    </div>
  );
}
