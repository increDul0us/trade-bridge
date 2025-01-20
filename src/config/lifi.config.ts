import { EVM, createConfig } from '@lifi/sdk';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

export const initializeLiFiConfig = () => {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  createConfig({
    integrator: 'trade-bridge',
    providers: [
      EVM({
        getWalletClient: () => Promise.resolve(createWalletClient({
          account,
          chain: mainnet,
          transport: http(),
        })),
      }),
    ],
  });

  return { account };
}; 