import { Router } from 'express';
import { createGroup, joinGroup, getUserGroups, getGroupMembers } from '../controllers/group.controller';

const router = Router();

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/user/:userId', getUserGroups);
router.get('/:groupId/members', getGroupMembers);

export default router;
