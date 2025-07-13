import * as msw from 'msw';
import { handlers } from './handlers';

export const worker = msw.setupWorker(...handlers); 