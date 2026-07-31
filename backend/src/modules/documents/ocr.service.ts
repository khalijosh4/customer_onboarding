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
    const langStr = this.config.get<string>('OCR_LANGUAGES', 'eng');
    const languages = langStr.split('+').filter(Boolean);

    // Where to find the Tesseract traineddata files (folder containing e.g. eng.traineddata)
    let tessdataDir = this.config.get<string>('OCR_TESSDATA_DIR', join(process.cwd(), 'tessdata'));
    if (!existsSync(tessdataDir)) {
      // Fallback: sometimes the traineddata was placed in the project root (e.g. eng.traineddata)
      const fallback = process.cwd();
      if (existsSync(join(fallback, `${languages[0]}.traineddata`))) {
        tessdataDir = fallback;
        this.logger.warn(`Using fallback tessdata directory ${tessdataDir}`);
      } else {
        this.logger.warn(`Tessdata directory not found at ${tessdataDir} — OCR may fail`);
      }
    }

    const timeoutMs = Number(this.config.get<string>('OCR_TIMEOUT_MS', '90000')) || 90000;

    let worker: any;
    try {
      // tesseract.js v5 signature: createWorker(langs, oem, options).
      // Earlier code passed the options object as `langs`, which the worker-script
      // misread and threw `langsArr.map is not a function`, leaving the worker
      // promise pending forever. `cacheMethod: 'none'` forces a read straight from
      // the local langPath every time, and `gzip: false` matches the un-gzipped
      // eng.traineddata file. `errorHandler` prevents the worker from throwing an
      // unhandled error out of the message handler (which would crash the process).
      worker = await this.withTimeout(
        createWorker(languages.join('+'), undefined, {
          langPath: tessdataDir,
          cacheMethod: 'none',
          gzip: false,
          errorHandler: (err: any) => this.logger.warn(`Tesseract worker error: ${err}`),
        } as any),
        timeoutMs,
        'Tesseract worker startup timed out',
      );
      // Silence worker-level crashes so they don't bubble up unhandled.
      if (worker?.worker) {
        worker.worker.on('error', () => {});
      }

      // In v5 the worker comes pre-loaded/pre-initialized, so only recognize() is needed.
      const {
        data: { text },
      } = await this.withTimeout<{ data: { text: string } }>(
        worker.recognize(filePath),
        timeoutMs,
        'Tesseract recognition timed out',
      );

      return this.parseKenyanId(text);
    } catch (error: any) {
      this.logger.error(`OCR recognition failed: ${error?.message || error}`);
      return { rawText: '' };
    } finally {
      try {
        if (worker) await worker.terminate();
      } catch (e) {
        // ignore
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
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
    const idNumber = this.pickIdNumber(text);

    // Dates can be printed as "22.12.2004", "22 / 12 / 2004", "18. 04. 2023",
    // or "2004-12-22" (MRZ), so allow optional spaces and any separator.
    const datePattern = /(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2,4})/g;
    const dates: { index: number; norm: string }[] = [];
    let dm: RegExpExecArray | null;
    while ((dm = datePattern.exec(text)) !== null) {
      const year = dm[3].length === 2 ? `19${dm[3]}` : dm[3];
      dates.push({
        index: dm.index,
        norm: `${dm[1].padStart(2, '0')}.${dm[2].padStart(2, '0')}.${year}`,
      });
    }

    // Prefer dates printed next to their label (DATE OF BIRTH / DATE OF ISSUE),
    // then fall back to reading order (first = DOB, second = issue, third = expiry).
    const findDateNear = (labelRe: RegExp): string | undefined => {
      for (const d of dates) {
        const before = text.slice(Math.max(0, d.index - 80), d.index);
        const after = text.slice(d.index, d.index + 40);
        if (labelRe.test(before) || labelRe.test(after)) return d.norm;
      }
      return undefined;
    };

    const dateOfBirth = findDateNear(/DATE\s*OF\s*BIRTH|DOB|BIRTH|BORN/i) || dates[0]?.norm;
    const dateOfIssue = findDateNear(/DATE\s*OF\s*ISSUE|ISSUE\s*DATE|ISSUE/i) || dates[1]?.norm;
    const dateOfExpiry = findDateNear(/EXPIR|VALID\s*UNTIL|DATE\s*OF\s*EXPIRY/i) || dates[2]?.norm;

    // Names on Kenyan IDs typically appear in capital letters on their own lines.
    // Exclude known label words (district/place/date/etc.) so the first real
    // all-caps line — the holder's name — is picked instead of field labels.
    const LABEL_WORDS =
      /REPUBLIC|KENYA|IDENTITY|CARD|DISTRICT|BIRTH|PLACE|ISSUE|DATE|MALE|FEMALE|HOLDER|SIGN|SERIAL|NO\b|NAME|SEX|HEIGHT|NATIONAL|PASSPORT|ID\b/i;
    const nameLines = text
      .split('\n')
      .map((l) => l.trim())
      .map((l) => ({ raw: l, clean: l.replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim() }))
      .filter(({ raw, clean }) => {
        if (!/^[A-Z]/.test(raw) || /\d/.test(raw)) return false;
        if (clean.length < 4 || clean.split(' ').length < 2) return false;
        if (LABEL_WORDS.test(clean)) return false;
        return true;
      })
      .map(({ clean }) => clean);

    return {
      rawText: text,
      idNumber,
      fullNameGuess: nameLines[0] || undefined,
      dateOfBirth,
      dateOfIssue,
      dateOfExpiry,
    };
  }

  /**
   * Kenyan National ID cards print BOTH the ID number (7–8 digits) and a longer
   * serial number. The serial often appears first on the card, so picking the
   * first 7–9 digit run can grab the wrong number. We therefore:
   *  1. Prefer a 7–8 digit run right after an "ID No." / "No." style label, and
   *  2. Otherwise prefer the first 7–8 digit run over a 9-digit serial.
   */
  private pickIdNumber(text: string): string | undefined {
    const labelMatch = text.match(
      /(?:id\s*(?:no|number)?|no\.?\s*|serial\s*no\.?\s*)[:.\-\s]*(\d{7,9})\b/i,
    );
    if (labelMatch) return labelMatch[1];

    const candidates = [...text.matchAll(/\b\d{7,9}\b/g)].map((m) => m[0]);
    if (candidates.length === 0) return undefined;
    const short = candidates.find((n) => n.length === 7 || n.length === 8);
    return short || candidates[0];
  }

  /**
   * Compares OCR-extracted values against what the member typed in Step 3.
   * Uses forgiving/fuzzy comparisons since OCR text is noisy.
   *
   * Matching rules:
   *  - ID number must match (digits-only, allowing OCR to miss/merge a digit).
   *  - At least one of date of birth / date of issue must also match. Names
   *    alone must never be enough — a member who typed a wrong DOB or issue
   *    date must be flagged, which is why the old "ID + 2 of 4 fields" rule
   *    was dropped (a correct name could mask two wrong dates).
   */
  matchesEnteredData(
    extracted: OcrExtractedIdData,
    entered: {
      idNumber: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      documentIssueDate?: string;
    },
  ): boolean {
    const idMatches = this.idsMatch(extracted.idNumber, entered.idNumber);
    const dobMatches = this.dobsMatch(extracted.dateOfBirth, entered.dateOfBirth);
    const issueMatches = this.dobsMatch(extracted.dateOfIssue, entered.documentIssueDate || '');

    return idMatches && (dobMatches || issueMatches);
  }

  private idsMatch(extracted?: string, entered?: string): boolean {
    if (!extracted || !entered) return false;
    const a = extracted.replace(/\D/g, '');
    const b = entered.replace(/\D/g, '');
    if (a === b) return true;
    // OCR occasionally drops/merges a digit — accept when one is contained in the other.
    if (a.length >= 6 && b.length >= 6) return a.includes(b) || b.includes(a);
    return false;
  }

  private dobsMatch(extracted?: string, entered?: string): boolean {
    if (!entered || !extracted) return false;
    const o = this.normalizeDate(extracted);
    const e = this.normalizeDate(entered);
    if (!o || !e) return false;
    if (o[0] === '00' || o[1] === '00') return false;
    if (o[0] === e[0] && o[1] === e[1] && o[2] === e[2]) return true;
    // Allow a 1-day drift caused by timezone conversion when date inputs are stored.
    const oDays = Date.UTC(+o[2], +o[1] - 1, +o[0]);
    const eDays = Date.UTC(+e[2], +e[1] - 1, +e[0]);
    return Math.abs(oDays - eDays) <= 86400000;
  }

  private normalizeDate(value: string): string[] | null {
    const v = value.trim();
    // ISO / date-input format: YYYY-MM-DD (optionally with time).
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return [m[3].padStart(2, '0'), m[2].padStart(2, '0'), m[1]];
    // Day-first format: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (with optional spaces).
    m = v.match(/(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})/);
    if (m) {
      const year = m[3].length === 2 ? `19${m[3]}` : m[3];
      return [m[1].padStart(2, '0'), m[2].padStart(2, '0'), year];
    }
    return null;
  }
}
