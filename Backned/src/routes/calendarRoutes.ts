import express from 'express';
import { verifyToken } from '../middleware/authmiddleware.js';
import {
  getTasks,
  addTask,
  toggleTask,
  deleteTask,
  importAIPlan,
  clearAITasks,
  clearCalendar,
} from '../controllers/calendarController.js';

const calendarRouter = express.Router();

// All routes require authentication
calendarRouter.use(verifyToken);

calendarRouter.get('/', getTasks);
calendarRouter.post('/', addTask);
calendarRouter.put('/:id/toggle', toggleTask);
calendarRouter.delete('/:id', deleteTask);
calendarRouter.post('/import-ai', importAIPlan);
calendarRouter.post('/clear-ai', clearAITasks);
calendarRouter.post('/clear-all', clearCalendar);

export default calendarRouter;
