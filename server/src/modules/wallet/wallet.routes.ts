import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticateJwt } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { depositSchema, withdrawalSchema, chapaInitializeSchema } from '../../shared';

const router = Router();

// Public Webhook from Chapa
router.post('/chapa/webhook', WalletController.chapaWebhook);

// Authenticated Wallet Operations
router.use(authenticateJwt);

router.get('/balance', WalletController.getBalance);
router.post('/demo-deposit', validateBody(depositSchema), WalletController.deposit);
router.post('/demo-withdrawal', validateBody(withdrawalSchema), WalletController.withdraw);
router.get('/transactions', WalletController.getTransactions);

// Chapa Integration Endpoints
router.post('/chapa/initialize', validateBody(chapaInitializeSchema), WalletController.initializeChapa);
router.get('/chapa/verify/:txRef', WalletController.verifyChapa);

export default router;
