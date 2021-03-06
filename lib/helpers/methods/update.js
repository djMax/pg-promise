'use strict';

var $npm = {
    TableName: require('../tableName'),
    ColumnSet: require('../columnSet'),
    formatting: require('../../formatting'),
    utils: require('../../utils')
};

/**
 * @method helpers.update
 * @description
 * Generates a simplified `UPDATE` query for either one object or an array of objects.
 *
 * The generated query is logically incomplete - it does not append a `WHERE` condition to determine the update logic.
 * This is to allow for update conditions of any complexity that are easy to append to the query.
 *
 * @param {Object|Object[]} data
 * An update object with properties for update values, or an array of such objects.
 *
 * When `data` is not a non-null object and not an array, it will throw {@link external:TypeError TypeError} = `Invalid parameter 'data' specified.`
 *
 * And if `data` is an array that contains an invalid update object, the method will throw {@link external:Error Error} =
 * `Invalid update object at index N.`
 *
 * @param {Array|helpers.Column|helpers.ColumnSet} [columns]
 * Set of columns to be updated.
 *
 * It is optional when `data` is a single object, and required when `data` is an array of objects. When not specified for an array
 * of objects, the method will throw {@link external:TypeError TypeError} = `Parameter 'columns' is required when updating multiple records.`
 *
 * When `columns` is not a {@link helpers.ColumnSet ColumnSet} object, a temporary {@link helpers.ColumnSet ColumnSet}
 * is created - from the value of `columns` (if it was specified), or from the value of `data` (if it is not an array).
 *
 * When the final {@link helpers.ColumnSet ColumnSet} is empty (no columns in it), it will throw
 * {@link external:Error Error} = `Cannot generate a valid UPDATE without any columns.`
 *
 * @param {helpers.TableName|String|{table,schema}} [table]
 * Table to be updated.
 *
 * It is normally a required parameter. But when `columns` is passed in as a {@link helpers.ColumnSet ColumnSet} object
 * with `table` set in it, that will be used when this parameter isn't specified. When neither is available, the method
 * will throw {@link external:Error Error} = `Table name is unknown.`
 *
 * @param {Object} [options]
 * An object with formatting options for multi-object updates. Passing in a non-null value that's not an object will
 * throw {@link external:TypeError TypeError} = `Invalid parameter 'options' specified.`
 *
 * @param {String} [options.tableAlias=t]
 * Name of the SQL variable that represents the destination table.
 *
 * @param {String} [options.valueAlias=v]
 * Name of the SQL variable that represents the values.
 *
 * @returns {String}
 * The resulting query string.
 *
 * @see {@link helpers.ColumnSet ColumnSet}
 *
 * @example
 *
 * var pgp = require('pg-promise')({
 *    capSQL: true // if you want all generated SQL capitalized
 * });
 *
 * var update = pgp.helpers.update, ColumnSet = pgp.helpers.ColumnSet;
 *
 * var dataSingle = {id: 1, val: 123, msg: 'hello'};
 * var dataMulti = [{id: 1, val: 123, msg: 'hello'}, {id: 2, val: 456, msg: 'world!'}];
 *
 * // Although column details can be taken from the data object, it is not a likely scenario one wants
 * // for an update, unless updating the whole table:
 * var query1 = update(dataSingle, null, 'my-table');
 * //=> UPDATE "my-table" SET "id"=1,"val"=123,"msg"='hello'
 *
 * // A typical single-object update:
 * var query2 = update(dataSingle, ['val', 'msg'], 'my-table') + ' WHERE id = ' + dataSingle.id;
 * //=> UPDATE "my-table" SET "id"=1,"value"=123,"msg"='hello' WHERE id = 1
 *
 * // Column details are required for a multi-object update;
 * // Adding '?' means the column's value is only for a WHERE condition:
 * var query3 = update(dataMulti, ['?id', 'val', 'msg'], 'my-table') + ' WHERE v."id" = t."id"';
 * //=> UPDATE "my-table" AS t SET "val"=v."val","msg"=v."msg" FROM (VALUES(1,123,'hello'),(2,456,'world!'))
 * //   AS v("id","val","msg") WHERE v."id" = t."id"
 *
 * // Using column details and table name from ColumnSet:
 * var cs = new ColumnSet(['?id', 'val', 'msg'], {table: 'my-table'});
 * var query4 = update(dataMulti, cs) + ' WHERE v."id" = t."id"';
 * //=> UPDATE "my-table" AS t SET "val"=v."val","msg"=v."msg" FROM (VALUES(1,123,'hello'),(2,456,'world!'))
 * //   AS v("id","val","msg") WHERE v."id" = t."id"
 *
 * // Changing the default aliases:
 * var query5 = update(dataMulti, cs, null, {tableAlias: 'X', valueAlias: 'Y'}) + ' WHERE Y."id" = X."id"';
 * //=> UPDATE "my-table" AS X SET "val"=Y."val","msg"=Y."msg" FROM (VALUES(1,123,'hello'),(2,456,'world!'))
 * //   AS Y("id","val","msg") WHERE Y."id" = X."id"
 *
 */
function update(data, columns, table, options, capSQL) {

    if (!data || typeof data !== 'object') {
        throw new TypeError("Invalid parameter 'data' specified.");
    }

    var isArray = Array.isArray(data);

    if (columns instanceof $npm.ColumnSet) {
        if ($npm.utils.isNull(table)) {
            table = columns.table;
        }
    } else {
        if (isArray && $npm.utils.isNull(columns)) {
            throw new TypeError("Parameter 'columns' is required when updating multiple records.");
        }
        columns = new $npm.ColumnSet(columns || data);
    }

    if (isArray && !data.length) {
        throw new TypeError("Cannot generate an UPDATE from an empty array.");
    }

    if (!$npm.utils.isNull(options) && typeof options !== 'object') {
        throw new TypeError("Invalid parameter 'options' specified.");
    }

    if (!table) {
        throw new Error("Table name is unknown.");
    }

    if (!(table instanceof $npm.TableName)) {
        table = new $npm.TableName(table);
    }

    var errNoColumns = "Cannot generate a valid UPDATE without any columns.";

    var format = $npm.formatting.as.format;

    if (isArray) {
        // Multi-update, as per:
        // http://stackoverflow.com/questions/18797608/update-multiple-rows-in-same-query-using-postgresql
        var tableAlias = 't', valueAlias = 'v';
        if (options) {
            if (options.tableAlias) {
                tableAlias = options.tableAlias.toString();
            }
            if (options.valueAlias) {
                valueAlias = options.valueAlias.toString();
            }
        }

        var query = "update $1^ as $2^ set $3^ from (values$4^) as $5^";
        if (capSQL) {
            query = query.toUpperCase();
        }

        var actualColumns = columns.columns.$filter(function (c) {
            return !c.cnd;
        });

        if (!actualColumns.length) {
            throw new Error(errNoColumns);
        }

        var targetCols = actualColumns.$map(function (c) {
            return c.escapedName + '=' + valueAlias + '.' + c.escapedName + c.castText;
        }).join();

        var values = data.$map(function (d, index) {
            if (!d || typeof d !== 'object') {
                throw new Error("Invalid update object at index " + index + ".");
            }
            return '(' + format(columns.variables, columns.prepare(d)) + ')';
        }).join();

        return format(query, [table.name, tableAlias, targetCols, values, valueAlias + columns.names]);
    }

    var updates = columns.getUpdates(data);

    if (!updates.length) {
        throw new Error(errNoColumns);
    }

    var query = "update $1^ set ";
    if (capSQL) {
        query = query.toUpperCase();
    }

    return format(query, table.name) + format(updates, columns.prepare(data));
}

module.exports = update;
