import express from 'express';
import { polygon, base } from 'viem/chains';
import { BridgeExecutionService } from './services/bridgeExecution.service';
import { BridgeRecordService } from './services/bridgeRecord.service';
import { initializeLiFiConfig } from './config/lifi.config';

const supportedChains = [polygon, base];
const { account } = initializeLiFiConfig(
  process.env.PRIVATE_KEY!,
  supportedChains
);

const recordService = new BridgeRecordService();
const executionService = new BridgeExecutionService(recordService);

const app = express();
app.use(express.json());

app.post('/api/bridge', async (req, res) => {
  try {
    const executionId = await executionService.startBridging(req.body);
    res.json({ executionId });
  } catch (error) {
    console.error('Bridge initiation failed:', error);
    res.status(500).json({ error: 'Failed to start bridge transaction' });
  }
});

app.get('/api/bridge/:executionId', async (req, res) => {
  try {
    const status = await recordService.getStatus(req.params.executionId);
    res.json({ status });
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(404).json({ error: 'Bridge record not found' });
  }
});

export default app; 