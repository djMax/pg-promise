'use strict';

var $npm = {
    utils: require('../utils'),
    formatting: require('../formatting')
};

/**
 * @class helpers.TableName
 * @description
 * **Alternative Syntax:** `TableName({table, [schema]})` &#8658; {@link helpers.TableName}
 *
 * Prepares and escapes a full table name that can be injected into queries directly.
 *
 * This is a read-only type that can be used wherever parameter `table` is supported.
 *
 * @param {String|Object} table
 * Table name details, depending on the type:
 *
 * - table name, if `table` is a string
 * - object `{table, [schema]}`
 *
 * @param {String} [schema]
 * Database schema name.
 *
 * When `table` is passed in as `{table, [schema]}`, this parameter is ignored.
 *
 * @property {String} name
 * Formatted/escaped full table name, based on properties `schema` + `table`.
 *
 * @property {String} table
 * Table name.
 *
 * @property {String} schema
 * Database schema name.
 *
 * It is `undefined` when no schema was specified (or if it was an empty string).
 *
 * @returns {helpers.TableName}
 *
 */
function TableName(table, schema) {

    if (!(this instanceof TableName)) {
        return new TableName(table, schema);
    }

    if (table && typeof table === 'object' && 'table' in table) {
        schema = table.schema;
        table = table.table;
    }

    if (!$npm.utils.isText(table)) {
        throw new TypeError("Table name must be non-empty text string.");
    }

    if (!$npm.utils.isNull(schema)) {
        if (typeof schema !== 'string') {
            throw new TypeError("Invalid schema name.");
        }
        if (schema.length > 0) {
            this.schema = schema;
        }
    }

    this.table = table;
    this.name = $npm.formatting.as.name(table);

    if (this.schema) {
        this.name = $npm.formatting.as.name(schema) + '.' + this.name;
    }

    Object.freeze(this);
}

/**
 * @method helpers.TableName.toString
 * @description
 * Creates a well-formatted string that represents the object.
 *
 * It is called automatically when writing the object into the console.
 *
 * @returns {String}
 */
TableName.prototype.toString = function () {
    return this.name;
};

TableName.prototype.inspect = function () {
    return this.toString();
};

module.exports = TableName;
