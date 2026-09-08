const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUSES,
  canPerformLifecycleAction,
} = require('../constants/productLifecycle');
const {
  PRODUCT_PERMISSION_ACTIONS,
  assertProductActionAllowed,
} = require('../constants/productPermissions');
const {
  MARKETPLACE_KEYS,
  MARKETPLACE_LISTING_STATUSES,
} = require('./productMarketplaceService');

const SALE_FLAG_FIELDS = Object.freeze([
  'internalAdvertisingStarted',
  'externalAdvertisingStarted',
  'reviewBonusEnabled',
  'sellerBonusEnabled',
]);

function normalizeNotes(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function requireBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

function assertKaspiListingCanEnterSale(kaspiListing) {
  if (!kaspiListing || kaspiListing.marketplace !== MARKETPLACE_KEYS.KASPI) {
    throw new Error('Kaspi listing is required to complete sale launch');
  }

  if (![MARKETPLACE_LISTING_STATUSES.PUBLISHED, MARKETPLACE_LISTING_STATUSES.IN_SALE]
    .includes(kaspiListing.status)) {
    throw new Error('Kaspi listing must be published before completing sale launch');
  }
}

function buildSaleLaunchCompletionPlan({
  product,
  kaspiListing,
  actor,
  payload = {},
  now = new Date(),
}) {
  if (!canPerformLifecycleAction({
    user: actor,
    product,
    action: PRODUCT_LIFECYCLE_ACTIONS.COMPLETE_SALE_LAUNCH,
  })) {
    throw new Error('Sale launch completion is not permitted from current status');
  }

  if (product.lifecycleCompletedAt) {
    throw new Error('Sale launch is already completed');
  }

  assertKaspiListingCanEnterSale(kaspiListing);

  const launchFlags = {
    productId: product.id,
    internalAdvertisingStarted: requireBoolean(payload.internalAdvertisingStarted, 'internalAdvertisingStarted'),
    externalAdvertisingStarted: requireBoolean(payload.externalAdvertisingStarted, 'externalAdvertisingStarted'),
    reviewBonusEnabled: requireBoolean(payload.reviewBonusEnabled, 'reviewBonusEnabled'),
    sellerBonusEnabled: requireBoolean(payload.sellerBonusEnabled, 'sellerBonusEnabled'),
    notes: normalizeNotes(payload.notes),
    updatedBy: actor.id,
    completedBy: actor.id,
    completedAt: now,
  };

  return {
    launchFlags,
    productUpdate: {
      lifecycleStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      lifecycleCompletedAt: now,
      marketplaceManagerId: actor.id,
      assignedToUserId: actor.id,
    },
    marketplaceListingUpdate: {
      status: MARKETPLACE_LISTING_STATUSES.IN_SALE,
      managedBy: actor.id,
    },
    history: {
      productId: product.id,
      actorId: actor.id,
      actionType: 'sale_launch_completed',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      message: 'Sale launch completed',
      metadata: {
        marketplaceListingId: kaspiListing.id,
        internalAdvertisingStarted: launchFlags.internalAdvertisingStarted,
        externalAdvertisingStarted: launchFlags.externalAdvertisingStarted,
        reviewBonusEnabled: launchFlags.reviewBonusEnabled,
        sellerBonusEnabled: launchFlags.sellerBonusEnabled,
      },
      createdAt: now,
    },
  };
}

function buildSaleLaunchUpdatePlan({
  product,
  launchFlags,
  actor,
  payload = {},
  now = new Date(),
}) {
  if (!product || product.lifecycleStatus !== PRODUCT_LIFECYCLE_STATUSES.IN_SALE) {
    throw new Error('Sale flags can only be updated for a product in sale');
  }
  assertProductActionAllowed({
    user: actor,
    product,
    action: PRODUCT_PERMISSION_ACTIONS.MANAGE_SALE_LAUNCH,
  });
  const completedAt = launchFlags?.completedAt || product.lifecycleCompletedAt;
  if (!completedAt) {
    throw new Error('Sale launch must be completed before later updates');
  }

  const launchFlagsUpdate = {
    internalAdvertisingStarted: requireBoolean(payload.internalAdvertisingStarted, 'internalAdvertisingStarted'),
    externalAdvertisingStarted: requireBoolean(payload.externalAdvertisingStarted, 'externalAdvertisingStarted'),
    reviewBonusEnabled: requireBoolean(payload.reviewBonusEnabled, 'reviewBonusEnabled'),
    sellerBonusEnabled: requireBoolean(payload.sellerBonusEnabled, 'sellerBonusEnabled'),
    notes: normalizeNotes(payload.notes),
    updatedBy: actor.id,
    ...(!launchFlags?.completedAt ? {
      completedAt,
      completedBy: launchFlags?.completedBy || actor.id,
    } : {}),
  };
  const changedFields = [
    ...SALE_FLAG_FIELDS.filter(
      (field) => Boolean(launchFlags[field]) !== launchFlagsUpdate[field]
    ),
    ...(normalizeNotes(launchFlags.notes) !== launchFlagsUpdate.notes ? ['notes'] : []),
  ];

  return {
    launchFlagsUpdate,
    productUpdate: {
      marketplaceManagerId: actor.id,
      assignedToUserId: actor.id,
      ...(!product.lifecycleCompletedAt ? { lifecycleCompletedAt: completedAt } : {}),
    },
    changedFields,
    history: changedFields.length > 0 ? {
      productId: product.id,
      actorId: actor.id,
      actionType: 'sale_flags_updated',
      fromStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      toStatus: PRODUCT_LIFECYCLE_STATUSES.IN_SALE,
      message: 'Sale launch settings updated',
      metadata: {
        changedFields,
        internalAdvertisingStarted: launchFlagsUpdate.internalAdvertisingStarted,
        externalAdvertisingStarted: launchFlagsUpdate.externalAdvertisingStarted,
        reviewBonusEnabled: launchFlagsUpdate.reviewBonusEnabled,
        sellerBonusEnabled: launchFlagsUpdate.sellerBonusEnabled,
      },
      createdAt: now,
    } : null,
  };
}

module.exports = {
  buildSaleLaunchCompletionPlan,
  buildSaleLaunchUpdatePlan,
};
