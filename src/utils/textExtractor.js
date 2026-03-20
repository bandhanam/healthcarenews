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

  const trimmedText = fullText.trim();
  
  if (trimmedText.length < 50 && totalPages <= 3) {
    if (onProgress) onProgress(0);
    return await extractTextFromPDFAsImages(file, onProgress);
  }

  return trimmedText;
}

async function extractTextFromPDFAsImages(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = Math.min(pdf.numPages, 5);
  let fullText = '';

  const worker = await createWorker('eng', 1, {
    logger: (info) => {
      if (onProgress && info.status === 'recognizing text') {
        const pageProgress = info.progress * 100;
        onProgress(Math.round(pageProgress / totalPages));
      }
    },
  });

  try {
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      const imageData = canvas.toDataURL('image/png');
      const { data } = await worker.recognize(imageData);
      fullText += data.text + '\n';
      
      if (onProgress) {
        onProgress(Math.round((i / totalPages) * 100));
      }
    }
  } finally {
    await worker.terminate();
  }

  return fullText.trim();
}

function detectFileType(file) {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp|heic|heif)$/)) return 'image';
  
  return null;
}

export function extractText(file, onProgress) {
  const fileType = detectFileType(file);
  
  if (fileType === 'pdf') return extractTextFromPDF(file, onProgress);
  if (fileType === 'image') return extractTextFromImage(file, onProgress);
  
  throw new Error(`Unsupported file type: ${file.type || file.name}. Please upload a PDF or image file.`);
}

export function isSupportedFile(file) {
  return detectFileType(file) !== null;
}

export const SUPPORTED_FORMATS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif'],
  documents: ['pdf'],
};
