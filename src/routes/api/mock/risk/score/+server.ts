import { riskScoreHandler } from '$lib/server/mock-api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => riskScoreHandler(request);