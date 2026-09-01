import { asyncHandler } from '../../../../../utils/asyncHandler.js';
import * as exploreService from '../services/exploreDestinationService.js';

const ok = (res, data, extra = {}) => res.json({ success: true, data, ...extra });

export const getAdminExploreDestinations = asyncHandler(async (req, res) =>
  ok(res, await exploreService.listAdminDestinations(req.query)),
);

export const getPublicExploreDestinations = asyncHandler(async (_req, res) =>
  ok(res, await exploreService.listActivePublicDestinations()),
);

export const getExploreDestinationById = asyncHandler(async (req, res) =>
  ok(res, await exploreService.getDestinationById(req.params.id)),
);

export const createExploreDestination = asyncHandler(async (req, res) =>
  ok(res, await exploreService.createDestination(req.body)),
);

export const updateExploreDestination = asyncHandler(async (req, res) =>
  ok(res, await exploreService.updateDestination(req.params.id, req.body)),
);

export const deleteExploreDestination = asyncHandler(async (req, res) => {
  await exploreService.deleteDestination(req.params.id);
  ok(res, { deleted: true });
});

export const toggleExploreDestinationStatus = asyncHandler(async (req, res) =>
  ok(res, await exploreService.toggleDestinationStatus(req.params.id)),
);
