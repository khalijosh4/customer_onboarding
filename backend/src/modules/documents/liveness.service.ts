import { BadRequestException, Injectable } from '@nestjs/common';

export interface LivenessCheckResult {
  verified: boolean;
  matchScore: number;
}

/**
 * Face-matching / liveness verification.
 *
 * By design, the actual face detection, liveness (blink/head-turn) checks,
 * and face-embedding extraction run in the BROWSER using Google MediaPipe
 * Face Landmarker + a TensorFlow.js face-embedding model (see
 * frontend/src/features/documents/useLiveness.ts). This keeps the member's
 * live camera feed off the server entirely — only the two numeric embedding
 * vectors (from the passport photo and the live selfie) and a boolean
 * "liveness gesture passed" flag are sent here.
 *
 * This service simply verifies the vectors are sufficiently similar
 * (cosine similarity) AND that the browser's liveness gesture check passed.
 */
@Injectable()
export class LivenessService {
  private readonly MATCH_THRESHOLD = 0.75;

  evaluate(
    passportEmbedding: number[],
    selfieEmbedding: number[],
    livenessGesturePassed: boolean,
  ): LivenessCheckResult {
    if (
      !Array.isArray(passportEmbedding) ||
      !Array.isArray(selfieEmbedding) ||
      passportEmbedding.length === 0 ||
      passportEmbedding.length !== selfieEmbedding.length
    ) {
      throw new BadRequestException('Invalid face embeddings received from the browser');
    }

    const matchScore = this.cosineSimilarity(passportEmbedding, selfieEmbedding);
    const verified = livenessGesturePassed && matchScore >= this.MATCH_THRESHOLD;

    return { verified, matchScore };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
