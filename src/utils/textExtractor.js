import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export async function extractTextFromImage(file, onProgress) {
  const worker = await createWorker('eng', 1, {
    logger: (info) => {
      if (onProgress && info.status === 'recognizing text') {
        onProgress(Math.round(info.progress * 100));
      }
    },
  });

  const url = URL.createObjectURL(file);
  try {
    const { data } = await worker.recognize(url);
    return data.text.trim();
  } finally {
    URL.revokeObjectURL(url);
    await worker.terminate();
  }
}

export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
    if (onProgress) onProgress(Math.round((i / totalPages) * 100));
  }

  return fullText.trim();
}

export function extractText(file, onProgress) {
  const type = file.type;
  if (type === 'application/pdf') return extractTextFromPDF(file, onProgress);
  if (type.startsWith('image/')) return extractTextFromImage(file, onProgress);
  throw new Error(`Unsupported file type: ${type}`);
}
