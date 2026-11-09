import { parseXml, readText, unzip } from "./zip";

/**
 * Real OOXML readers. These parse the actual document parts (text runs, sheet cells, slide
 * shapes) so a preview shows the file's own content rather than a mock.
 */

export interface DocxBlock {
  type: "heading" | "paragraph" | "bullet" | "table";
  text?: string;
  level?: number;
  rows?: string[][];
}

export interface DocxModel {
  kind: "docx";
  blocks: DocxBlock[];
}

export interface SheetModel {
  name: string;
  rows: string[][];
}

export interface XlsxModel {
  kind: "xlsx";
  sheets: SheetModel[];
}

export interface SlideModel {
  index: number;
  title: string;
  lines: string[];
  notes: string;
}

export interface PptxModel {
  kind: "pptx";
  slides: SlideModel[];
}

function textOf(node: Element, selector: string): string {
  const parts = Array.from(node.getElementsByTagName(selector));
  return parts
    .map((part) => part.textContent ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export async function readDocx(buffer: ArrayBuffer): Promise<DocxModel> {
  const files = await unzip(buffer);
  const xml = readText(files, "word/document.xml");
  if (!xml) throw new Error("The Word document has no readable body.");
  const document = parseXml(xml);
  if (!document) throw new Error("The Word document body could not be parsed.");

  const blocks: DocxBlock[] = [];
  const body = document.getElementsByTagName("w:body")[0];
  if (!body) throw new Error("The Word document body is empty.");

  for (const child of Array.from(body.children)) {
    if (child.tagName === "w:p") {
      const text = textOf(child, "w:t");
      if (!text) continue;
      const styleNode = child.getElementsByTagName("w:pStyle")[0];
      const style = styleNode?.getAttribute("w:val") ?? "";
      if (/^Heading(\d)$/.test(style)) {
        const level = Number(/^Heading(\d)$/.exec(style)?.[1] ?? "1");
        blocks.push({ type: "heading", text, level });
      } else if (style === "ListBullet" || style === "ListParagraph") {
        blocks.push({ type: "bullet", text });
      } else if (style === "Title") {
        blocks.push({ type: "heading", text, level: 0 });
      } else {
        blocks.push({ type: "paragraph", text });
      }
      continue;
    }
    if (child.tagName === "w:tbl") {
      const rows = Array.from(child.getElementsByTagName("w:tr")).map((row) =>
        Array.from(row.getElementsByTagName("w:tc")).map((cell) => textOf(cell, "w:t")),
      );
      if (rows.length > 0) blocks.push({ type: "table", rows });
    }
  }

  return { kind: "docx", blocks };
}

function columnIndex(reference: string): number {
  const letters = /^[A-Z]+/.exec(reference)?.[0] ?? "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function sharedStrings(files: Map<string, Uint8Array>): string[] {
  const xml = readText(files, "xl/sharedStrings.xml");
  if (!xml) return [];
  const document = parseXml(xml);
  if (!document) return [];
  return Array.from(document.getElementsByTagName("si")).map((item) => textOf(item, "t"));
}

function sheetTargets(files: Map<string, Uint8Array>): { name: string; path: string }[] {
  const workbook = readText(files, "xl/workbook.xml");
  const rels = readText(files, "xl/_rels/workbook.xml.rels");
  if (!workbook) return [];
  const workbookDocument = parseXml(workbook);
  if (!workbookDocument) return [];

  const relationMap = new Map<string, string>();
  if (rels) {
    const relDocument = parseXml(rels);
    for (const relation of Array.from(relDocument?.getElementsByTagName("Relationship") ?? [])) {
      const id = relation.getAttribute("Id") ?? "";
      const target = relation.getAttribute("Target") ?? "";
      if (id)
        relationMap.set(
          id,
          target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`,
        );
    }
  }

  return Array.from(workbookDocument.getElementsByTagName("sheet")).map((sheet) => {
    const name = sheet.getAttribute("name") ?? "Sheet";
    const relationId = sheet.getAttribute("r:id") ?? "";
    return { name, path: relationMap.get(relationId) ?? "" };
  });
}

export async function readXlsx(buffer: ArrayBuffer): Promise<XlsxModel> {
  const files = await unzip(buffer);
  const strings = sharedStrings(files);
  const targets = sheetTargets(files);
  const sheets: SheetModel[] = [];

  for (const target of targets) {
    const xml = target.path ? readText(files, target.path) : null;
    if (!xml) continue;
    const document = parseXml(xml);
    if (!document) continue;

    const rows: string[][] = [];
    for (const row of Array.from(document.getElementsByTagName("row"))) {
      const cells: string[] = [];
      for (const cell of Array.from(row.getElementsByTagName("c"))) {
        const reference = cell.getAttribute("r") ?? "";
        const type = cell.getAttribute("t") ?? "n";
        let value = "";
        if (type === "s") {
          const index = Number(textOf(cell, "v"));
          value = strings[index] ?? "";
        } else if (type === "inlineStr") {
          value = textOf(cell, "t");
        } else {
          value = textOf(cell, "v");
        }
        const position = columnIndex(reference);
        while (cells.length < position) cells.push("");
        cells[position] = value;
      }
      if (cells.some((cell) => cell !== "")) rows.push(cells);
    }
    sheets.push({ name: target.name, rows });
  }

  if (sheets.length === 0) throw new Error("The workbook has no readable worksheets.");
  return { kind: "xlsx", sheets };
}

export async function readPptx(buffer: ArrayBuffer): Promise<PptxModel> {
  const files = await unzip(buffer);
  const slidePaths = [...files.keys()]
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort(
      (a, b) => Number(/(\d+)\.xml$/.exec(a)?.[1] ?? 0) - Number(/(\d+)\.xml$/.exec(b)?.[1] ?? 0),
    );

  const slides: SlideModel[] = [];
  slidePaths.forEach((path, position) => {
    const xml = readText(files, path);
    if (!xml) return;
    const document = parseXml(xml);
    if (!document) return;

    const shapes = Array.from(document.getElementsByTagName("p:sp"));
    const lines: string[] = [];
    let title = "";

    for (const shape of shapes) {
      const placeholder = shape.getElementsByTagName("p:ph")[0];
      const type = placeholder?.getAttribute("type") ?? "";
      const shapeText = Array.from(shape.getElementsByTagName("a:p"))
        .map((paragraph) => textOf(paragraph, "a:t"))
        .filter((line) => line.length > 0);
      if (shapeText.length === 0) continue;
      if (!title && (type === "title" || type === "ctrTitle" || position === 0)) {
        title = shapeText.join(" ");
        continue;
      }
      lines.push(...shapeText);
    }

    const notesPath = path.replace("slides/slide", "notesSlides/notesSlide");
    const notesXml = readText(files, notesPath);
    let notes = "";
    if (notesXml) {
      const notesDocument = parseXml(notesXml);
      const body = notesDocument?.getElementsByTagName("p:body")[0];
      notes = body ? textOf(body, "a:t") : "";
    }

    slides.push({ index: position + 1, title: title || `Slide ${position + 1}`, lines, notes });
  });

  if (slides.length === 0) throw new Error("The presentation has no readable slides.");
  return { kind: "pptx", slides };
}

export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}
