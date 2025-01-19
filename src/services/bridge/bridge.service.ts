import { executeRoute, getRoutes } from '@lifi/sdk';
import { BridgeRequest } from './types';

export class BridgeService {

  async startBridging(request: BridgeRequest) {
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

    const routeResponse = await getRoutes(routeRequest);
    const route = routeResponse.routes[0];
    await executeRoute(route, {
      updateRouteHook: (updatedRoute) => {
        console.log(updatedRoute);
      }
    });
  }
} 