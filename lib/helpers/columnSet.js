'use strict';

require('../array');

var $npm = {
    os: require('os'),
    utils: require('../utils'),
    formatting: require('../formatting'),
    TableName: require('./tableName'),
    Column: require('./column')
};

/**
 * @class helpers.ColumnSet
 * @description
 *
 * ** WARNING: Everything within the {@link helpers} namespace is currently in its Alpha version.**
 *
 * Performance-optimized, read-only structure about all query-formatting columns.
 *
 * For performance-oriented applications this type should be created globally, to be reused by methods
 * {@link helpers.insert insert} and {@link helpers.update update}.
 *
 * @param {Object|helpers.Column|Array} columns
 * Columns information object, depending on the type:
 *
 * - When it is a simple object, its properties are enumerated to represent both column names and property names
 *   within the source objects. See also option `inherit` that's applicable in this case.
 *
 * - When it is a single {@link helpers.Column Column} object, property {@link helpers.ColumnSet#columns columns} is initialized with
 *   just a single column. It is not a unique situation when only a single column is required for an update operation.
 *
 * - When it is an array, each element is assumed to represent details for a column. If the element is already of type {@link helpers.Column Column},
 *   it is used directly; otherwise the element is passed into {@link helpers.Column Column} constructor for initialization.
 *
 * - When it is none of the above, it will throw {@link external:TypeError TypeError} = `Invalid parameter 'columns' specified.`
 *
 * @param {Object} [options]
 *
 * @param {helpers.TableName|String|{table,schema}} [options.table]
 * Table details.
 *
 * When it is a non-null value, and not a {@link helpers.TableName TableName} object, a new {@link helpers.TableName TableName} is constructed from the value.
 *
 * It can be used as the default for methods {@link helpers.insert insert} and {@link helpers.update update} when their parameter
 * `table` is omitted, and for logging purposes.
 *
 * @param {Boolean} [options.inherit = false]
 * Use inherited properties in addition to the object's own properties.
 *
 * By default, only the object's own properties are enumerated for column names.
 *
 * @returns {helpers.ColumnSet}
 *
 */
function ColumnSet(columns, options) {

    if (!(this instanceof ColumnSet)) {
        return new ColumnSet(columns, options);
    }

    if (!columns || typeof columns !== 'object') {
        throw new TypeError("Invalid parameter 'columns' specified.");
    }

    var inherit, names, variables, updates;

    if (!$npm.utils.isNull(options)) {
        if (typeof options !== 'object') {
            throw new TypeError("Invalid parameter 'options' specified.");
        }
        if (!$npm.utils.isNull(options.table)) {
            if (options.table instanceof $npm.TableName) {
                this.table = options.table;
            } else {
                this.table = new $npm.TableName(options.table);
            }
        }
        inherit = options.inherit;
    }

    /**
     * @name helpers.ColumnSet#table
     * @type {helpers.TableName}
     * @readonly
     * @description
     * Destination table. It can be specified for two purposes:
     *
     * - **primary:** to be used as the default table when it is omitted during a call into methods {@link helpers.insert insert} and {@link helpers.update update}
     * - **secondary:** to be automatically written into the console (for logging purposes).
     */


    /**
     * @name helpers.ColumnSet#columns
     * @type helpers.Column[]
     * @readonly
     * @description
     * Array of {@link helpers.Column Column} objects.
     */
    if (Array.isArray(columns)) {
        this.columns = columns.$map(function (c) {
            return (c instanceof $npm.Column) ? c : new $npm.Column(c);
        });
    } else {
        if (columns instanceof $npm.Column) {
            this.columns = [columns];
        } else {
            this.columns = [];
            for (var name in columns) {
                if (inherit || columns.hasOwnProperty(name)) {
                    this.columns.push(new $npm.Column(name));
                }
            }
        }
    }

    /**
     * @name helpers.ColumnSet#names
     * @type String
     * @readonly
     * @description
     * A string that contains a comma-separated list of escaped column names, wrapped in `()`.
     */
    Object.defineProperty(this, 'names', {
        get: function () {
            if (!names) {
                names = this.columns.$map(function (c) {
                    return c.escapedName;
                }).join();
                if (names) {
                    names = '(' + names + ')';
                }
            }
            return names;
        }
    });

    /**
     * @name helpers.ColumnSet#variables
     * @type String
     * @readonly
     * @description
     * A string that contains a comma-separated list of all variables for the set of columns.
     */
    Object.defineProperty(this, 'variables', {
        get: function () {
            if (!variables) {
                variables = this.columns.$map(function (c) {
                    return c.variable;
                }).join();
            }
            return variables;
        }
    });

    this.getUpdates = function (obj) {
        if (updates) {
            return updates;
        }
        var dynamic;
        var list = this.columns.$filter(function (c) {
            if (c.cnd) {
                return false;
            }
            if (c.skip) {
                dynamic = true;
                if (c.skip.call(obj, c.prop || c.name)) {
                    return false;
                }
            }
            return true;
        }).$map(function (c) {
            return c.escapedName + '=' + c.variable + c.castText;
        }).join();
        if (!dynamic) {
            updates = list;
        }
        return list;
    };

    /**
     * @method helpers.ColumnSet.canUpdate
     * @description
     * Checks if it is possible to generate an `UPDATE` query (via method {@link helpers.update update}) for the specified `data`
     * and the current {@link helpers.ColumnSet ColumnSet} object, without running into errors related to the shortage of effective
     * update columns or the lack of data.
     *
     * The result and the logic depend on whether `data` is a single object or an array, and it is consistent with the validation
     * logic that's implemented by the {@link helpers.update update} method.
     *
     * This method is mainly valuable for those single-object updates that make use of property {@link helpers.Column Column.skip}, which
     * makes the list of effective columns dynamic.
     *
     * @param {Object|Array} data
     * Data intended for an `UPDATE` query - a single source object or an array of such objects.
     *
     * Passing in a non-object value will throw {@link external:TypeError TypeError} = `Invalid parameter 'data' specified.`
     *
     * @returns {Boolean}
     * 
     * - `true` - it is possible to generate a valid `UPDATE` query via method {@link helpers.update update}
     * - `false` - passing such `data` into method {@link helpers.update update} will inevitably throw an error
     */
    this.canUpdate = function (data) {
        if (!data || typeof data !== 'object') {
            throw new TypeError("Invalid parameter 'data' specified.");
        }
        var cnd = 0, skip = 0, total = this.columns.length;
        if (Array.isArray(data)) {
            // TODO: This can be optimized by caching the counter.
            cnd = this.columns.$countIf(function (c) {
                return c.cnd;
            });
            return total > cnd && data.length > 0;
        }
        this.columns.$forEach(function (c) {
            cnd += c.cnd ? 1 : 0;
            if (c.skip) {
                skip += c.skip.call(data, c.prop || c.name) ? 1 : 0;
            }
        });
        return total > cnd + skip;
    };


    /**
     * @method helpers.ColumnSet.prepare
     * @description
     * Prepares a source object to be formatted, by cloning it and applying the rules
     * as set by the columns configuration.
     *
     * This method is meant primarily for internal use.
     *
     * @param {Object} obj
     * Source object to be prepared.
     *
     * @returns {Object}
     * A clone of the source objects, with all properties and values set according to
     * the columns configuration.
     */
    this.prepare = function (obj) {
        var target = {};
        this.columns.$forEach(function (c) {
            var name = c.prop || c.name;
            if (name in obj) {
                var value = obj[name];
                target[name] = c.init ? c.init.call(obj, value) : value;
            } else {
                var value;
                if ('def' in c) {
                    target[name] = value = c.def;
                }
                if (c.init) {
                    target[name] = c.init.call(obj, value);
                }
            }
        }, this);
        return target;
    };

    Object.freeze(this);
}

/**
 * @method helpers.ColumnSet.toString
 * @description
 * Creates a well-formatted multi-line string that represents the object.
 *
 * It is called automatically when writing the object into the console.
 *
 * @param {Number} [level=0]
 * Nested output level, to provide visual offset.
 *
 * @returns {string}
 */
ColumnSet.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    var gap0 = $npm.utils.messageGap(level),
        gap1 = $npm.utils.messageGap(level + 1),
        lines = [
            'ColumnSet {'
        ];
    if (this.table) {
        lines.push(gap1 + 'table: ' + this.table);
    }
    if (this.columns.length) {
        lines.push(gap1 + 'columns: [');
        this.columns.$forEach(function (c) {
            lines.push(c.toString(2));
        });
        lines.push(gap1 + ']');
    } else {
        lines.push(gap1 + 'columns: []');
    }
    lines.push(gap0 + '}');
    return lines.join($npm.os.EOL);
};

ColumnSet.prototype.inspect = function () {
    return this.toString();
};

module.exports = ColumnSet;
