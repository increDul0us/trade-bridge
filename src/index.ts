import 'dotenv/config';
import { polygon, base } from 'viem/chains';
import { BridgeExecutionService } from './services/bridgeExecution.service';
import { BridgeRecordService } from './services/bridgeRecord.service';
import { initializeLiFiConfig } from './config/lifi.config';
import { ChainId, CoinKey } from '@lifi/sdk';
import { findDefaultToken } from '@lifi/data-types'


async function main() {
    try {
        const supportedChains = [polygon, base];
        
        const { account } = initializeLiFiConfig(
            process.env.PRIVATE_KEY!,
            supportedChains
        );

        const recordService = new BridgeRecordService();
        const executionService = new BridgeExecutionService(recordService);

        const fromTokenAddress = findDefaultToken(CoinKey.USDC, ChainId.POL).address;
        const toTokenAddress = findDefaultToken(CoinKey.USDC, ChainId.BAS).address;

        const executionId = await executionService.startBridging({
            fromChainId: ChainId.POL,
            toChainId: ChainId.BAS,
            fromAmount: '100000',
            fromTokenAddress,
            toTokenAddress,
            fromAddress: account.address,
            toAddress: account.address,
            slippage: 0.03,
        });

        console.log(`Bridge process started with execution ID: ${executionId}`);

        const status = await recordService.getStatus(executionId);
        console.log('Current status:', status);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();