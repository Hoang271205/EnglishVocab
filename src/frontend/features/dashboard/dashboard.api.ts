import { apiRequest } from '../../api/client';
import type { DashboardResponse } from './dashboard.types';

export const dashboardApi = {
  async summary(signal: AbortSignal) {
    const result = await apiRequest<DashboardResponse>(
      '/api/progress/summary',
      { signal },
    );

    return result.summary;
  },
};