import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWorker } from 'tesseract.js';
import { join } from 'path';
import { existsSync } from 'fs';

export interface OcrExtractedIdData {
  rawText: string;
  idNumber?: string;
  fullNameGuess?: string;
  dateOfBirth?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
}

/**
 * In-house OCR using Tesseract.js — no external OCR API/vendor required, as
 * requested. Runs fully on this server. For production accuracy, consider
 * pre-processing scans (deskew/threshold via `sharp`) before recognition,
 * and training/using a Kenyan-ID-specific Tesseract data file if available.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly config: ConfigService) {}

  async extractFromImage(filePath: string): Promise<OcrExtractedIdData> {
    const languages = this.config.get<string>('OCR_LANGUAGES', 'eng');

    // Where to find the Tesseract traineddata files (folder containing e.g. eng.traineddata)
    let tessdataDir = this.config.get<string>('OCR_TESSDATA_DIR', join(process.cwd(), 'tessdata'));
    if (!existsSync(tessdataDir)) {
      // Fallback: sometimes the traineddata was placed in the project root (e.g. eng.traineddata)
      const fallback = process.cwd();
      if (existsSync(join(fallback, `${languages}.traineddata`))) {
        tessdataDir = fallback;
        this.logger.warn(`Using fallback tessdata directory ${tessdataDir}`);
      } else {
        this.logger.warn(`Tessdata directory not found at ${tessdataDir} — OCR may fail`);
      }
    }

    // tesseract.js typings vary by version; await createWorker and cast options to any
    // to keep compatibility with the installed release (v5.x).
    const worker: any = await createWorker({ langPath: tessdataDir, cachePath: tessdataDir } as any);

    try {
      // Proper worker lifecycle: load core, load language files and initialize
      await worker.load();
      await worker.loadLanguage(languages);
      await worker.initialize(languages);

      const {
        data: { text },
      } = await worker.recognize(filePath);

      return this.parseKenyanId(text);
    } catch (error: any) {
      this.logger.error(`OCR recognition failed: ${error?.message || error}`);
      return { rawText: '' };
    } finally {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Very lightweight heuristic parser for Kenyan National ID / passport
   * front-side layouts. Real-world documents vary, so this looks for common
   * label keywords and nearby number/date patterns rather than assuming a
   * fixed layout. Tune the regexes as you test against real scans.
   */
  private parseKenyanId(rawText: string): OcrExtractedIdData {
    const text = rawText.replace(/\r/g, '');
    const idNumberMatch = text.match(/\b\d{7,9}\b/);
    const dateMatches = [...text.matchAll(/\b(\d{2}[./-]\d{2}[./-]\d{4})\b/g)].map((m) => m[1]);

    // Names on Kenyan IDs typically appear in capital letters on their own lines.
    const nameLines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[A-Z\s]{4,}$/.test(l) && !/REPUBLIC|KENYA|IDENTITY|CARD/.test(l));

    return {
      rawText: text,
      idNumber: idNumberMatch?.[0],
      fullNameGuess: nameLines.slice(0, 3).join(' ').trim() || undefined,
      dateOfBirth: dateMatches[0],
      dateOfIssue: dateMatches[1],
      dateOfExpiry: dateMatches[2],
    };
  }

  /**
   * Compares OCR-extracted values against what the member typed in Step 3.
   * Uses forgiving/fuzzy comparisons since OCR text is noisy.
   */
  matchesEnteredData(
    extracted: OcrExtractedIdData,
    entered: { idNumber: string; firstName: string; lastName: string; dateOfBirth: string },
  ): boolean {
    const idMatches =
      !!extracted.idNumber && extracted.idNumber.replace(/\D/g, '') === entered.idNumber.replace(/\D/g, '');

    const nameHaystack = (extracted.fullNameGuess || extracted.rawText).toUpperCase();
    const firstNameMatches = nameHaystack.includes(entered.firstName.toUpperCase());
    const lastNameMatches = nameHaystack.includes(entered.lastName.toUpperCase());

    // Require ID number match plus at least one name token match — OCR
    // rarely nails full names perfectly, especially with glare/low quality.
    return idMatches && (firstNameMatches || lastNameMatches);
  }
}
