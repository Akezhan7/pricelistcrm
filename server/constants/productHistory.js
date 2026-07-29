const PRODUCT_ACTION_TYPES = Object.freeze({
  PRODUCT_CREATED: 'product_created',
  PRODUCT_UPDATED: 'product_updated',
  PRODUCT_ARCHIVED: 'product_archived',
  DESIGNER_ASSIGNED: 'designer_assigned',
  CONTENT_UPLOADED: 'content_uploaded',
  CONTENT_ASSET_DELETED: 'content_asset_deleted',
  CONTENT_CREATED: 'content_created',
  SUBMITTED_FOR_REVIEW: 'submitted_for_review',
  REVISION_REQUESTED: 'revision_requested',
  REVISION_RESUBMITTED: 'revision_resubmitted',
  APPROVED: 'approved',
  MARKETPLACE_UPDATED: 'marketplace_updated',
  MARKETPLACE_PLACEMENT_READY: 'marketplace_placement_ready',
  SUPPLIER_LINKED: 'supplier_linked',
  SUPPLIER_UPDATED: 'supplier_updated',
  SUPPLIER_UNLINKED: 'supplier_unlinked',
  PURCHASE_MARKED: 'purchase_marked',
  WAREHOUSE_ARRIVAL_MARKED: 'warehouse_arrival_marked',
  WAREHOUSE_COMPLETED: 'warehouse_completed',
  WAREHOUSE_LOCATION_UPDATED: 'warehouse_location_updated',
  STOCK_UPDATED: 'stock_updated',
  SALE_LAUNCH_COMPLETED: 'sale_launch_completed',
  SALE_FLAGS_UPDATED: 'sale_flags_updated',
});

const PRODUCT_ACTION_MESSAGES = Object.freeze({
  [PRODUCT_ACTION_TYPES.PRODUCT_CREATED]: 'Product created',
  [PRODUCT_ACTION_TYPES.PRODUCT_UPDATED]: 'Product card updated',
  [PRODUCT_ACTION_TYPES.PRODUCT_ARCHIVED]: 'Product archived',
  [PRODUCT_ACTION_TYPES.CONTENT_ASSET_DELETED]: 'Product content asset deleted',
  [PRODUCT_ACTION_TYPES.SUPPLIER_LINKED]: 'Product supplier linked',
  [PRODUCT_ACTION_TYPES.SUPPLIER_UPDATED]: 'Product supplier updated',
  [PRODUCT_ACTION_TYPES.SUPPLIER_UNLINKED]: 'Product supplier unlinked',
  [PRODUCT_ACTION_TYPES.STOCK_UPDATED]: 'Product stock settings updated',
  [PRODUCT_ACTION_TYPES.WAREHOUSE_LOCATION_UPDATED]: 'Product warehouse location updated',
});

module.exports = {
  PRODUCT_ACTION_MESSAGES,
  PRODUCT_ACTION_TYPES,
};
