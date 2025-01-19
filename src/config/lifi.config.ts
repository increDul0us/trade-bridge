import { EVM, createConfig } from '@lifi/sdk';
import { Chain, WalletClient, createWalletClient, http } from 'viem';
import { Account, privateKeyToAccount } from 'viem/accounts';

export const initializeLiFiConfig = (
  privateKey: string,
  supportedChains: Chain[]
) => {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const defaultClient = createWalletClient({
    account,
    chain: supportedChains[0],
    transport: http(),
  });

  createConfig({
    integrator: 'trade-bridge',
    providers: [
      EVM({
        getWalletClient: () => Promise.resolve(defaultClient),
        switchChain: (chainId) =>
          Promise.resolve(
            createWalletClient({
              account,
              chain: supportedChains.find((chain) => chain.id === chainId),
              transport: http(),
            })
          ),
      }),
    ],
  });

  return {
    account,
    client: defaultClient,
  };
}; 