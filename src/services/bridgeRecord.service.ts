import { Route, RouteExtended } from '@lifi/sdk';
import { prisma } from '../lib/prisma';
import { BridgeStatus } from '@prisma/client';


export class BridgeRecordService {
  async createRecord(route: Route): Promise<string> {
    const record = await prisma.bridgeRecord.create({
      data: {
        fromAddress: route.fromAddress!,
        toAddress: route.toAddress!,
        fromChainId: route.fromChainId,
        toChainId: route.toChainId,
        fromAmount: route.fromAmount,
        fromToken: route.fromToken.address,
        toToken: route.toToken.address,
        route: route as any,
        steps: route.steps.map(step => ({
          tool: step.tool,
          status: 'PENDING'
        }))
      }
    });

    return record.id;
  }

  async updateRecord(executionId: string, route: RouteExtended) {
    const steps = route.steps.map(step => ({
      tool: step.tool,
      status: step.execution?.status || 'PENDING',
      txHash: step.execution?.process?.[0]?.txHash
    }));

    const status = steps.every(step => step.status === 'DONE') ? BridgeStatus.COMPLETED 
                 : steps.some(step => step.status === 'FAILED') ? BridgeStatus.FAILED
                 : BridgeStatus.PENDING;

    await prisma.bridgeRecord.update({
      where: { id: executionId },
      data: {
        status,
        steps,
        route: route as any,
      }
    });
  }

  async getStatus(executionId: string): Promise<BridgeStatus> {
    const record = await prisma.bridgeRecord.findUnique({
      where: { id: executionId }
    });

    if (!record) {
      throw new Error('Bridge record not found');
    }
    
    return record.status;
  }
} 