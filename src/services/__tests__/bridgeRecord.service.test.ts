import { BridgeRecordService } from '../bridgeRecord.service';
import { prisma } from '../../lib/prisma';
import { BridgeStatus } from '@prisma/client';
import { RouteExtended } from '@lifi/sdk';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    bridgeRecord: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('BridgeRecordService', () => {
  let bridgeRecordService: BridgeRecordService;

  const mockRoute = {
    fromAddress: '0x123',
    toAddress: '0x456',
    fromChainId: 1,
    toChainId: 137,
    fromAmount: '1000000000000000000',
    fromToken: { address: '0x789' },
    toToken: { address: '0xabc' },
    steps: [
      {
        tool: 'tool1',
        status: 'PENDING'
      }
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    bridgeRecordService = new BridgeRecordService();
  });

  describe('createRecord', () => {
    it('should create a new bridge record', async () => {
      const mockCreatedRecord = {
        id: 'record-123',
        ...mockRoute,
      };

      (prisma.bridgeRecord.create as jest.Mock).mockResolvedValue(mockCreatedRecord);

      const result = await bridgeRecordService.createRecord(mockRoute as any);

      expect(result).toBe('record-123');
      expect(prisma.bridgeRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromAddress: mockRoute.fromAddress,
          toAddress: mockRoute.toAddress,
          fromChainId: mockRoute.fromChainId,
          toChainId: mockRoute.toChainId,
          fromAmount: mockRoute.fromAmount,
          fromToken: mockRoute.fromToken.address,
          toToken: mockRoute.toToken.address,
          steps: [{ tool: 'tool1', status: 'PENDING' }],
        }),
      });
    });
  });

  describe('updateRecord', () => {
    it('should update record status to COMPLETED when all steps are done', async () => {
      const mockUpdatedRoute = {
        ...mockRoute,
        steps: [
          {
            tool: 'tool1',
            execution: { 
              status: 'DONE',
              process: [{ txHash: '0x123' }]
            },
          }
        ],
      } as RouteExtended;

      await bridgeRecordService.updateRecord('record-123', mockUpdatedRoute);

      expect(prisma.bridgeRecord.update).toHaveBeenCalledWith({
        where: { id: 'record-123' },
        data: expect.objectContaining({
          status: BridgeStatus.COMPLETED,
          steps: [{
            tool: 'tool1',
            status: 'DONE',
            txHash: '0x123'
          }],
        }),
      });
    });

    it('should update record status to FAILED when any step fails', async () => {
      const mockUpdatedRoute = {
        ...mockRoute,
        steps: [
          {
            tool: 'tool1',
            execution: { 
              status: 'FAILED',
              process: [{ txHash: '0x123' }]
            },
          }
        ],
      } as RouteExtended;

      await bridgeRecordService.updateRecord('record-123', mockUpdatedRoute);

      expect(prisma.bridgeRecord.update).toHaveBeenCalledWith({
        where: { id: 'record-123' },
        data: expect.objectContaining({
          status: BridgeStatus.FAILED,
        }),
      });
    });
  });

  describe('getStatus', () => {
    it('should return the status of a bridge record', async () => {
      const mockRecord = {
        status: BridgeStatus.PENDING,
      };

      (prisma.bridgeRecord.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const status = await bridgeRecordService.getStatus('record-123');

      expect(status).toBe(BridgeStatus.PENDING);
      expect(prisma.bridgeRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'record-123' },
      });
    });

    it('should throw error when record is not found', async () => {
      (prisma.bridgeRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(bridgeRecordService.getStatus('non-existent'))
        .rejects.toThrow('Bridge record not found');
    });
  });
}); 