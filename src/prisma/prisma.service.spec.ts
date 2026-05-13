import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockPrismaClientConstructor = jest.fn();
const mockPrismaPgConstructor = jest.fn();
const mockAdapter = {
  adapterName: '@prisma/adapter-pg',
  provider: 'postgres',
};

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation((config) => {
    mockPrismaPgConstructor(config);

    return mockAdapter;
  }),
}));

jest.mock('../../generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(function (
    this: { $connect: jest.Mock; $disconnect: jest.Mock },
    options,
  ) {
    mockPrismaClientConstructor(options);
    this.$connect = mockConnect;
    this.$disconnect = mockDisconnect;
  }),
}));

describe('PrismaService', () => {
  const databaseUrl = 'postgresql://user:password@localhost:5432/test';

  let moduleRef: TestingModule;
  let service: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    jest.clearAllMocks();

    moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = moduleRef.get<PrismaService>(PrismaService);
    await moduleRef.init();
  });

  afterAll(async () => {
    await moduleRef.close();
    delete process.env.DATABASE_URL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should instantiate PrismaClient with PostgreSQL adapter options', () => {
    expect(mockPrismaPgConstructor).toHaveBeenCalledWith({
      connectionString: databaseUrl,
    });
    expect(mockPrismaClientConstructor).toHaveBeenCalledWith({
      adapter: mockAdapter,
      errorFormat: 'colorless',
    });
  });

  it('should connect when the module initializes', () => {
    expect(service.$connect).toHaveBeenCalledTimes(1);
  });

  it('should disconnect when the module is destroyed', async () => {
    await service.onModuleDestroy();

    expect(service.$disconnect).toHaveBeenCalledTimes(1);
    mockDisconnect.mockClear();
  });
});
