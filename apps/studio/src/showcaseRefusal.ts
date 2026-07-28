import type { PreviewCapabilities } from '../../../packages/shared/src/bridge';
import { compareCapabilities } from './comparisonState';

const queryCapabilities: PreviewCapabilities = {
  routeSync: { version: 1, contract: 'ticket-query-v1' },
  fixtureContext: { version: 1, contract: 'support-ticket-ticket-query-v1', entityType: 'ticket' },
  sourceSelection: { version: 1 }
};
const pathCapabilities: PreviewCapabilities = {
  routeSync: { version: 1, contract: 'ticket-path-v1' },
  fixtureContext: { version: 1, contract: 'support-ticket-ticket-path-v1', entityType: 'ticket' },
  sourceSelection: { version: 1 }
};

export const showcaseRefusalEvidence = {
  leftContract: queryCapabilities.routeSync!.contract,
  rightContract: pathCapabilities.routeSync!.contract,
  route: '/tickets/:ticketId',
  reason: compareCapabilities(queryCapabilities, pathCapabilities).reason,
  evidence: 'tests/e2e/multi-preview.spec.ts · branch-incompatible-route',
  next: 'Align the route contract manually, then rerun compatibility analysis.'
} as const;
