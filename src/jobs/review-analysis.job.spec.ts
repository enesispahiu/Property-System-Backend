import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewAnalysisJob } from './review-analysis.job';

describe('ReviewAnalysisJob', () => {
  let job: ReviewAnalysisJob;

  const prisma = {
    review: {
      findMany: jest.fn(),
    },
    reviewAnalysis: {
      create: jest.fn(),
    },
  };

  const aiService = {
    analyzeReview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewAnalysisJob,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    job = module.get(ReviewAnalysisJob);
  });

  it('finds reviews without analysis and stores AI analysis', async () => {
    prisma.review.findMany.mockResolvedValue([
      { id: 10, comment: 'Clean and comfortable stay.' },
    ]);
    aiService.analyzeReview.mockResolvedValue({
      sentiment: 'POSITIVE',
      summary: 'Guest liked the stay.',
      issue: null,
    });
    prisma.reviewAnalysis.create.mockResolvedValue({});

    await job.processPendingReviews();

    expect(prisma.review.findMany).toHaveBeenCalledWith({
      where: { analysis: null },
      select: { id: true, comment: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    expect(aiService.analyzeReview).toHaveBeenCalledWith({
      comment: 'Clean and comfortable stay.',
    });
    expect(prisma.reviewAnalysis.create).toHaveBeenCalledWith({
      data: {
        reviewId: 10,
        sentiment: 'POSITIVE',
        summary: 'Guest liked the stay.',
        issue: null,
      },
    });
  });

  it('does not crash or store analysis when AI fails', async () => {
    prisma.review.findMany.mockResolvedValue([
      { id: 11, comment: 'The room was noisy.' },
    ]);
    aiService.analyzeReview.mockRejectedValue(new Error('AI unavailable'));

    await expect(job.processPendingReviews()).resolves.toBeUndefined();

    expect(prisma.reviewAnalysis.create).not.toHaveBeenCalled();
  });

  it('skips processing when no reviews are pending', async () => {
    prisma.review.findMany.mockResolvedValue([]);

    await job.processPendingReviews();

    expect(aiService.analyzeReview).not.toHaveBeenCalled();
    expect(prisma.reviewAnalysis.create).not.toHaveBeenCalled();
  });
});
