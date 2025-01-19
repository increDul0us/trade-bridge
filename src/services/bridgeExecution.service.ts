import { executeRoute, getRoutes, Route } from '@lifi/sdk';
import { BridgeRecordService } from './bridgeRecord.service';

export interface BridgeRequest {
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
}

export class BridgeExecutionService {
  constructor(
    private readonly recordService: BridgeRecordService
  ) {}

  async startBridging(request: BridgeRequest): Promise<string> {
    console.log('Starting bridge process with request:', request);

    const routeRequest = {
      fromAddress: request.fromAddress,
      toAddress: request.toAddress,
      fromChainId: request.fromChainId,
      toChainId: request.toChainId,
      fromAmount: request.fromAmount,
      fromTokenAddress: request.fromTokenAddress,
      toTokenAddress: request.toTokenAddress,
      options: {
        slippage: request.slippage || 0.03,
      },
    };

    console.log('Fetching available routes...');
    const routeResponse = await getRoutes(routeRequest);
    console.log(`Found ${routeResponse.routes.length} available routes`);
    
    const route = routeResponse.routes[0];
    console.log('Selected route:', {
      steps: route.steps.map(step => step.tool),
      estimatedDuration: route.steps[0]?.estimate?.executionDuration
    });

    console.log('Creating bridge record...');
    const executionId = await this.recordService.createRecord(route);
    console.log(`Bridge record created with ID: ${executionId}`);

    this.executeBridge(executionId, route);

    return executionId;
  }

  private async executeBridge(executionId: string, route: Route) {
    try {
      console.log(`Starting bridge execution for ID: ${executionId}`);
      
      const result = await executeRoute(route, {
        updateRouteHook: (updatedRoute) => {
          console.log(`Updating route status for ${executionId}:`, {
            steps: updatedRoute.steps.map(step => ({
              tool: step.tool,
              status: step.execution?.status
            }))
          });
          this.recordService.updateRecord(executionId, updatedRoute);
        }
      });

      console.log(`Bridge execution completed for ${executionId}. Result: ${result.steps[0]?.execution?.process}`);
    } catch (error) {
      console.error(`Bridge execution failed for ${executionId}:`, error);
    }
  }
} 