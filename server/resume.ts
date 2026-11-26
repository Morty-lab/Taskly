import mammoth from "mammoth";
import { getDocumentProxy } from "unpdf";
import type { ResumeResult } from "../shared/types.ts";
import { extractDetails } from "./details.ts";
import { detect } from "./skills.ts";

export const ACCEPTED = [".pdf", ".docx", ".txt", ".md"];

export class UserError extends Error {}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

/**
 * PDF text with its lines intact. Detail extraction needs real lines (the name is the first line, a
 * heading is a short line of its own), so rebuild them from each text run's position instead of
 * merging everything into one string.
 */
async function pdfText(data: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    let line = "";
    let lastY: number | null = null;
    let lastEnd = 0;
    for (const item of content.items as PdfTextItem[]) {
      if (typeof item.str !== "string") continue;
      const x = item.transform[4];
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line);
        line = "";
      } else if (line && item.str && x - lastEnd > 1 && !line.endsWith(" ") && !item.str.startsWith(" ")) {
        line += " "; // a visible gap between runs on the same line is a word break
      }
      line += item.str;
      lastY = y;
      lastEnd = x + item.width;
      if (item.hasEOL) {
        if (line.trim()) lines.push(line);
        line = "";
        lastY = null;
      }
    }
    if (line.trim()) lines.push(line);
  }
  return lines.join("\n");
}

async function textOf(name: string, data: Buffer): Promise<string> {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf") return pdfText(data);
  if (ext === ".docx") return (await mammoth.extractRawText({ buffer: data })).value;
  if (ext === ".txt" || ext === ".md") return data.toString("utf8");
  throw new UserError(`Unsupported file type "${ext}". Upload a PDF, DOCX or TXT file.`);
}

/** Parse the resume in memory. The server never stores the file; the browser stores it in Appwrite. */
export async function parseResume(name: string, data: Buffer): Promise<ResumeResult> {
  const text = await textOf(name, data);
  if (text.trim().length < 50) {
    throw new UserError(
      "Couldn't read any text from that file. If it's a scanned PDF, export it from Word/Docs as a text PDF or DOCX instead.",
    );
  }
  const { skills, roles } = detect(text);
  return { fileName: name, skills, roles, details: extractDetails(text), characters: text.length };
}
