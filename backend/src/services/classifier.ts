/**
 * ClassificationService — the single seam handlers import. Dispatches by
 * CLASSIFIER_PROVIDER:
 *
 *   'rekognition' → the ACTIVE provider (tomorrow's demo path)
 *   'bedrock'     → intact recovery path (services/classify.ts, untouched);
 *                   also the code-level default so existing tests need no
 *                   environment setup — the deployed template sets rekognition.
 *
 * Deliberately NOT a fallback chain: one provider per deployment, switchable
 * with one template parameter. Bedrock recovers when the account restriction
 * is lifted by flipping ClassifierProvider — zero code changes.
 */

import type { ClassificationResult } from '../shared/types';
import { config } from '../shared/config';
import { classifyImageRekognition } from './rekognition';
import { classifyImage as classifyImageBedrock } from './classify';

export function classifyImage(image: {
  bytes: Buffer;
  mime: 'image/jpeg' | 'image/png';
}): Promise<ClassificationResult> {
  return config.classifierProvider === 'bedrock'
    ? classifyImageBedrock(image)
    : classifyImageRekognition(image);
}
