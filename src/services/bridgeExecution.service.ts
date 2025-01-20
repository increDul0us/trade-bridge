import { executeRoute, getRoutes, Route, RoutesRequest, RouteOptions, ChainId, CoinKey } from '@lifi/sdk';
import { BridgeRecordService } from './bridgeRecord.service';
import { Account } from 'viem';
import { findDefaultToken } from '@lifi/data-types';

export interface BridgeRequest {
  toChainId: number;
  fromAmount: string;
  coinId: string;
  toAddress: string;
  slippage?: number;
}

export class BridgeExecutionService {
  private readonly DEFAULT_SLIPPAGE = 0.005; // 0.5%
  private readonly MAX_SLIPPAGE = 0.03; // 3%
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly recordService: BridgeRecordService,
    private readonly account: Account,
  ) {}

  async startBridging(request: BridgeRequest): Promise<string> {
    this.validateRequest(request);
    console.log('Starting bridge process with request:', request);

    const routeRequest = this.buildRouteRequest(request);
    const route = await this.findBestRoute(routeRequest);
    
    console.log('Creating bridge record...');
    const executionId = await this.recordService.createRecord(route);
    console.log(`Bridge record created with ID: ${executionId}`);

    this.executeBridgeWithMonitoring(executionId, route);

    return executionId;
  }

  private validateRequest(request: BridgeRequest) {
    if (!request.toChainId) {
      throw new Error('Missing chain ID');
    }

    if(!Object.values(ChainId).includes(request.toChainId)) {
      throw new Error('Invalid chain ID');
    }

    if (!request.fromAmount || isNaN(Number(request.fromAmount)) || Number(request.fromAmount) <= 0) {
      throw new Error('Missing amount');
    }

    if (!request.coinId) {
      throw new Error('Missing coinId');
    }

    if(!Object.keys(CoinKey).includes(request.coinId)) {
      throw new Error('Invalid coinId');
    }

    if (!request.toAddress || !request.toAddress.startsWith('0x')) {
      throw new Error('Missing destination address');
    }

    if (request.slippage && (request.slippage <= 0 || request.slippage > this.MAX_SLIPPAGE)) {
      throw new Error(`Slippage must be between 0 and ${this.MAX_SLIPPAGE * 100}%`);
    }
  }

  private buildRouteRequest(request: BridgeRequest): RoutesRequest {
    const fromChainId = ChainId.ETH;
    const toChainId = request.toChainId;
    const fromTokenAddress = findDefaultToken(request.coinId as CoinKey, fromChainId).address;
    const toTokenAddress = findDefaultToken(request.coinId as CoinKey, toChainId).address;

    return {
      fromAddress: this.account.address,
      toAddress: request.toAddress,
      fromChainId,
      toChainId,
      fromAmount: request.fromAmount,
      fromTokenAddress,
      toTokenAddress,
      options: {
        slippage: request.slippage || this.DEFAULT_SLIPPAGE,
        allowSwitchChain: true,
        order: 'RECOMMENDED',
      },
    };
  }

  private async findBestRoute(routeRequest: RoutesRequest, attempt = 1): Promise<Route> {
    try {
      console.log('Fetching available routes...');
      const routeResponse = await getRoutes(routeRequest);
      console.log(`Found ${routeResponse.routes.length} available routes`);

      if (routeResponse.routes.length === 0) {
        if (attempt < this.MAX_RETRIES) {
          console.log(`No routes found, retrying (${attempt}/${this.MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.findBestRoute(routeRequest, attempt + 1);
        }
        throw new Error('No available routes found after retries');
      }

      const executionRoute = routeResponse.routes[0];

      console.log('Selected execution route:', {
        steps: executionRoute.steps.map(step => step.tool),
        estimatedDuration: executionRoute.steps[0]?.estimate?.executionDuration,
        gasCost: executionRoute.gasCostUSD,
        outputAmount: executionRoute.toAmount
      });

      return executionRoute;
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        console.log(`Route finding failed, retrying (${attempt}/${this.MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.findBestRoute(routeRequest, attempt + 1);
      }
      throw error;
    }
  }

  private async executeBridgeWithMonitoring(executionId: string, route: Route) {
    let retryCount = 0;

    const execute = async () => {
      try {
        console.log(`Starting bridge execution for ID: ${executionId}`);
        
        await executeRoute(route, {
          updateRouteHook: async (updatedRoute) => {
            console.log(`Updating route status for ${executionId}:`, {
              steps: updatedRoute.steps.map(step => ({
                tool: step.tool,
                status: step.execution?.status,
              }))
            });

            await this.recordService.updateRecord(executionId, updatedRoute);
          }
        });

        console.log(`Bridge execution completed for ${executionId}.`);
      } catch (error) {
        console.error(`Bridge execution failed for ${executionId}:`, error);
        
        if (retryCount < this.MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying execution (${retryCount}/${this.MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          await execute();
        } else {
          console.error(`Max retries reached for ${executionId}`);
        }
      }
    };

    execute().catch(error => {
      console.error(`Fatal error in bridge execution for ${executionId}:`, error);
    });
  }
} 