/* eslint-disable import/extensions */
import {Router} from 'express';
import authMiddleware from "../middlewares/auth.middleware";
import { getSignUp, postSignUp, postLogin, getLogin, deleteLogout  } from '../controller/auth.controller';

const router = Router();

router.get(`/signup`, authMiddleware, getSignUp)
router.post(`/signup`, authMiddleware, postSignUp)
router.get(`/login`, authMiddleware, getLogin)
router.post(`/login`, authMiddleware, postLogin)
router.delete(`/logout`, authMiddleware, deleteLogout)

