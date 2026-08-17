import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticateJwt } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { depositSchema, withdrawalSchema } from '@bingo/shared';

const router = Router();

router.use(authenticateJwt);

router.get('/balance', WalletController.getBalance);
router.post('/demo-deposit', validateBody(depositSchema), WalletController.deposit);
router.post('/demo-withdrawal', validateBody(withdrawalSchema), WalletController.withdraw);
router.get('/transactions', WalletController.getTransactions);

export default router;
