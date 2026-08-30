/*
 * Creates the credential store for TEAMOMF portal logins.
 *
 * Only a derived password *hash* is ever stored -- see src/auth/password.ts.
 * Rows are created exclusively by the `yarn teamomf:user` CLI, so this table
 * starts empty and never contains seeded or demo accounts.
 */

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('teamomf_credentials', table => {
    table.comment('Local password credentials for TEAMOMF portal users');
    table.increments('id').primary();
    table
      .string('username')
      .notNullable()
      .unique()
      .comment('Lower-cased login name');
    table
      .string('email')
      .notNullable()
      .unique()
      .comment('Lower-cased email, used to resolve the catalog User entity');
    table.string('display_name').notNullable();
    table
      .string('password_hash')
      .notNullable()
      .comment('scrypt$<version>$<salt-b64>$<derived-key-b64>');
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('teamomf_credentials');
};
