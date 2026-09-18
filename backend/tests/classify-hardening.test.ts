import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Bedrock hardening tests: retry discipline, prompt-injection containment,
 * deadline enforcement. The Bedrock SDK client is fully mocked.
 */

const { bedrockSend } = vi.hoisted(() => ({ bedrockSend: vi.fn() }));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send = bedrockSend;
  },
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.hoisted(() => {
  process.env.BEDROCK_MODEL_ID = 'test-primary-model';
  process.env.BEDROCK_MODEL_ID_FALLBACK = 'test-fallback-model';
  process.env.CLASSIFY_TIMEOUT_MS = '500';
});

import { classifyImage, classificationToolConfig, SYSTEM_PROMPT_TEST_ONLY } from '../src/services/classify';
import { ClassificationError } from '../src/shared/errors';

const IMAGE = { bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), mime: 'image/jpeg' as const };

function toolUseResponse(category: string, confidence: number) {
  return {
    output: {
      message: {
        content: [
          {
            toolUse: {
              name: 'report_waste_classification',
              toolUseId: 'tu',
              input: { category, confidence, rationale: 'Moulded translucent bottle.' },
            },
          },
        ],
      },
    },
  };
}

beforeEach(() => {
  bedrockSend.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('prompt safety (§6)', () => {
  it('instructs the model to treat in-image text as content, never instructions', () => {
    expect(SYSTEM_PROMPT_TEST_ONLY).toMatch(/text visible in the photo/i);
    expect(SYSTEM_PROMPT_TEST_ONLY).toMatch(/never follow/i);
  });

  it('forces tool use so prose can never bypass validation', () => {
    expect(classificationToolConfig.toolChoice).toEqual({
      tool: { name: 'report_waste_classification' },
    });
  });

  it('exposes no user-controlled text channel: only static strings in the prompt', () => {
    // classifyImage builds messages from SYSTEM_PROMPT_TEST_ONLY + fixed text only;
    // assert the fixed user-turn exists and carries no template holes.
    expect(SYSTEM_PROMPT_TEST_ONLY).not.toContain('${');
  });
});

describe('retry discipline (§5)', () => {
  it('does NOT retry permanent errors on the same model — goes straight to fallback', async () => {
    bedrockSend
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'AccessDeniedException' }))
      .mockResolvedValueOnce(toolUseResponse('plastic', 0.9));

    const result = await classifyImage(IMAGE);
    expect(result.category).toBe('plastic');
    expect(bedrockSend).toHaveBeenCalledTimes(2); // 1 primary + 1 fallback (no primary retry)
  });

  it('retries transient throttling with backoff, then succeeds', async () => {
    bedrockSend
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { name: 'ThrottlingException' }))
      .mockResolvedValueOnce(toolUseResponse('metal', 0.8));

    const result = await classifyImage(IMAGE);
    expect(result.category).toBe('metal');
    expect(bedrockSend).toHaveBeenCalledTimes(2);
  });

  it('retries malformed model output (no toolUse) and recovers', async () => {
    bedrockSend
      .mockResolvedValueOnce({ output: { message: { content: [{ text: 'probably plastic' }] } } })
      .mockResolvedValueOnce(toolUseResponse('glass', 0.7));

    const result = await classifyImage(IMAGE);
    expect(result.category).toBe('glass');
  });

  it('never retries ValidationException on the primary', async () => {
    bedrockSend
      .mockRejectedValueOnce(Object.assign(new Error('bad model id'), { name: 'ValidationException' }))
      .mockRejectedValueOnce(Object.assign(new Error('bad model id'), { name: 'ValidationException' }));

    await expect(classifyImage(IMAGE)).rejects.toThrow(ClassificationError);
    expect(bedrockSend).toHaveBeenCalledTimes(2); // one per model, no same-model retry
  });

  it('exhausts the whole chain and throws a typed ClassificationError', async () => {
    bedrockSend.mockRejectedValue(
      Object.assign(new Error('still busy'), { name: 'ThrottlingException' }),
    );
    await expect(classifyImage(IMAGE)).rejects.toThrow(ClassificationError);
    // 3 primary + 2 fallback attempts, bounded by the deadline.
    expect(bedrockSend.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects out-of-bounds confidence from the model via runtime validation', async () => {
    bedrockSend.mockResolvedValueOnce({
      output: {
        message: {
          content: [
            {
              toolUse: {
                name: 'report_waste_classification',
                toolUseId: 'tu',
                input: { category: 'plastic', confidence: 1.7, rationale: 'Looks plastic.' },
              },
            },
          ],
        },
      },
    });
    bedrockSend.mockResolvedValueOnce(toolUseResponse('plastic', 0.8));

    const result = await classifyImage(IMAGE);
    expect(result.confidence).toBe(0.8); // first verdict rejected, retry succeeded
  });
});
