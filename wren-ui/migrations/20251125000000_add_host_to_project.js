/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('project', (table) => {
    table.string('host', 255).nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('project', (table) => {
    table.dropColumn('host');
  });
};
