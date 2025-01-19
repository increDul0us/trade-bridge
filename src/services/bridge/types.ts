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