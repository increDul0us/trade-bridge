import { BridgeExecutionService, BridgeRequest } from '../bridgeExecution.service';
import { BridgeRecordService } from '../bridgeRecord.service';
import { getRoutes, executeRoute } from '@lifi/sdk';
import { Account } from 'viem';

jest.mock('@lifi/sdk');
jest.mock('../bridgeRecord.service');

describe('BridgeExecutionService', () => {
  let bridgeExecutionService: BridgeExecutionService;
  let mockRecordService: jest.Mocked<BridgeRecordService>;
  let mockAccount: Account;

  const validRequest: BridgeRequest = {
    toChainId: 137,
    fromAmount: '1000000000000000000',
    coinId: 'USDC',
    toAddress: '0x789',
    slippage: 0.01
  };

  const mockRoute = {
    fromAddress: '0x123',
    toAddress: '0x789',
    fromChainId: 1,
    toChainId: 137,
    fromAmount: '1000000000000000000',
    fromToken: { address: '0x123' },
    toToken: { address: '0x456' },
    steps: [
      {
        tool: 'tool1',
        estimate: { executionDuration: 300 },
      }
    ],
    gasCostUSD: '10',
    toAmount: '990000000000000000'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAccount = {
      address: '0xabc',
      publicKey: '0x123',
      signMessage: jest.fn(),
      signTypedData: jest.fn(),
    } as any;

    mockRecordService = {
      createRecord: jest.fn().mockResolvedValue('execution-id-123'),
      updateRecord: jest.fn(),
      getStatus: jest.fn(),
    };

    (getRoutes as jest.Mock).mockResolvedValue({
      routes: [mockRoute]
    });

    (executeRoute as jest.Mock).mockResolvedValue(undefined);

    bridgeExecutionService = new BridgeExecutionService(
      mockRecordService,
      mockAccount
    );
  });

  describe('startBridging', () => {
    it('should successfully start a bridge transaction', async () => {
      const executionId = await bridgeExecutionService.startBridging(validRequest);

      expect(executionId).toBe('execution-id-123');
      expect(getRoutes).toHaveBeenCalled();
      expect(mockRecordService.createRecord).toHaveBeenCalledWith(mockRoute);
    });

    it('should throw error for invalid chain ID', async () => {
      const invalidRequest = { ...validRequest, toChainId: 0 };
      await expect(bridgeExecutionService.startBridging(invalidRequest))
        .rejects.toThrow('Missing chain ID');
    });

    it('should throw error for invalid amount', async () => {
      const invalidRequest = { ...validRequest, fromAmount: '0' };
      await expect(bridgeExecutionService.startBridging(invalidRequest))
        .rejects.toThrow('Missing amount');
    });

    it('should throw error for invalid coinId', async () => {
      const invalidRequest = { ...validRequest, coinId: 'INVALID' };
      await expect(bridgeExecutionService.startBridging(invalidRequest))
        .rejects.toThrow('Invalid coinId');
    });

    it('should throw error for invalid destination address', async () => {
      const invalidRequest = { ...validRequest, toAddress: 'invalid' };
      await expect(bridgeExecutionService.startBridging(invalidRequest))
        .rejects.toThrow('Missing destination address');
    });

    it('should throw error for invalid slippage', async () => {
      const invalidRequest = { ...validRequest, slippage: 0.05 };
      await expect(bridgeExecutionService.startBridging(invalidRequest))
        .rejects.toThrow('Slippage must be between 0 and 3%');
    });

    it('should retry when no routes are found', async () => {
      (getRoutes as jest.Mock)
        .mockResolvedValueOnce({ routes: [] })
        .mockResolvedValueOnce({ routes: [mockRoute] });

      const executionId = await bridgeExecutionService.startBridging(validRequest);

      expect(executionId).toBe('execution-id-123');
      expect(getRoutes).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries when no routes are found', async () => {
      (getRoutes as jest.Mock).mockResolvedValue({ routes: [] });

      await expect(bridgeExecutionService.startBridging(validRequest))
        .rejects.toThrow('No available routes found after retries');
    });
  });
}); 