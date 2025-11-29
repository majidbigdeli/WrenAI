/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.table('project', (table) => {
    table.uuid('unique_id').notNullable().unique();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.table('project', (table) => {
    table.dropColumn('unique_id');
  });
};
