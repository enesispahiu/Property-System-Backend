import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns structured review analysis', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        message: {
          content:
            'sentiment: NEGATIVE\nsummary: Guest reported a noisy room.\nissue: Noise at night',
        },
      }),
    }) as unknown as typeof fetch;

    await expect(
      service.analyzeReview({ comment: 'The room was noisy at night.' }),
    ).resolves.toEqual({
      sentiment: 'NEGATIVE',
      summary: 'Guest reported a noisy room.',
      issue: 'Noise at night',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });
});
