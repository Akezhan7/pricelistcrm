module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('product_marketplace_listings');
    if (Object.prototype.hasOwnProperty.call(table, 'marketplace_article')
      && !Object.prototype.hasOwnProperty.call(table, 'campaign_name')) {
      await queryInterface.renameColumn('product_marketplace_listings', 'marketplace_article', 'campaign_name');
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('product_marketplace_listings');
    if (Object.prototype.hasOwnProperty.call(table, 'campaign_name')
      && !Object.prototype.hasOwnProperty.call(table, 'marketplace_article')) {
      await queryInterface.renameColumn('product_marketplace_listings', 'campaign_name', 'marketplace_article');
    }
  },
};
