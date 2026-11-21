import { Router } from 'express';
import {
  showRegister,
  showLogin,
  register,
  login,
  logout
} from '../controllers/auth.js';

const router = Router();

router.get('/register', showRegister);
router.get('/login', showLogin);

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

export default router;