import 'dotenv/config';
import { polygon, base } from 'viem/chains';
import { BridgeService } from './services/bridge/bridge.service';
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

        const bridgeService = new BridgeService();

        const fromTokenAddress = findDefaultToken(CoinKey.USDC, ChainId.POL).address;
        const toTokenAddress = findDefaultToken(CoinKey.USDC, ChainId.BAS).address;

        // Start bridging
        await bridgeService.startBridging({
            fromChainId: ChainId.POL,
            toChainId: ChainId.BAS,
            fromAmount: '100000',
            fromTokenAddress,
            toTokenAddress,
            fromAddress: account.address,
            toAddress: account.address,
            slippage: 0.03,
        });


    } catch (error) {
        console.error('Error:', error);
    }
}

main();