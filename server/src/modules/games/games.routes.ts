import { Router } from 'express';
import { GamesController } from './games.controller';
import { authenticateJwt } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { createGameSchema, joinGameSchema, bingoClaimSchema } from '../../shared';

const router = Router();

// Publicly visible game listings
router.get('/', GamesController.listGames);
router.get('/:id', GamesController.getGameDetails);

// Authenticated game actions
router.post('/', authenticateJwt, validateBody(createGameSchema), GamesController.createGame);
router.post('/:id/join', authenticateJwt, GamesController.joinGame);
router.get('/:id/my-tickets', authenticateJwt, GamesController.getMyTickets);
router.get('/:id/tickets', authenticateJwt, GamesController.getMyTickets);
router.post('/:id/claim-bingo', authenticateJwt, GamesController.claimBingo);

export default router;
