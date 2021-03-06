'use strict';

var $npm = {
    os: require('os'),
    utils: require('../utils'),
    formatting: require('../formatting')
};

/**
 *
 * @class helpers.Column
 * @description
 *
 * ** WARNING: Everything within the {@link helpers} namespace is currently in its Alpha version.**
 *
 * Read-only structure that represents formatting details for a single column.
 *
 * @param {String|helpers.ColumnConfig} col
 * Column details, depending on the type:
 *
 * - When it is a string, it is expected to contain a name for both the column and the source property,
 *   assuming that the two are the same. The name must adhere to JavaScript syntax for variable names.
 *   The name can be appended with any format modifier as supported by {@link formatting.format as.format}
 *   (`^`, `~`, `#`, `:csv`, `:json`, `name`, `raw`, `:value`), which is then removed from the name and put
 *   into property `mod`. If the name starts with `?`, it is removed, while setting flag `cnd`=`true`.
 *
 * - When it is a simple {@link helpers.ColumnConfig ColumnConfig}-like object, it is used as an
 *   input configurator to set all the properties of the class.
 *
 * - When it is none of the above, it will throw {@link external:TypeError TypeError} = `A column must be a string or a configurator object.`
 *
 * @property {String} name
 * Column name + property name (if `prop` isn't specified).
 *
 * @property {String} [prop]
 * Source property name, if different from the column's name.
 *
 * @property {String} [mod]
 * Formatting modifier, as supported by method {@link formatting.format as.format}: `^`, `~`, `#`, `:csv`, `:json`, `name`, `raw`, `:value`.
 *
 * @property {String} [cast]
 * Server-side type casting, without `::` in front.
 *
 * @property {Boolean} [cnd]
 * Conditional column flag.
 *
 * Used by multi-object updates only, it indicates that the column's value is not to be updated,
 * and it is only for use within an update condition.
 *
 * When initializing from a string, it is the same as putting `?` in front of the name.
 *
 * @property {} [def]
 * Default value for the property, to be used only when the source object doesn't have the property.
 *
 * @property {helpers.initCB} [init]
 * Value override callback. See property `init` in {@link helpers.ColumnConfig ColumnConfig}.
 *
 * @property {helpers.skipCB} [skip]
 * An override for skipping columns. See property `skip` in {@link helpers.ColumnConfig ColumnConfig}.
 *
 * It is ignored when conditional flag `cnd` is set.
 *
 * @returns {helpers.Column}
 *
 * @see {@link helpers.ColumnConfig ColumnConfig}
 *
 * @example
 *
 * var pgp = require('pg-promise')({
 *     capSQL: true // if you want all generated SQL capitalized
 * });
 *
 * var Column = pgp.helpers.Column;
 *
 * // creating a column from just a name:
 * var col1 = new Column('colName');
 * console.log(col1);
 * //=>
 * // Column {
 * //    name: "colName"
 * // }
 *
 * // creating a column from a name + modifier:
 * var col2 = new Column('colName:csv');
 * console.log(col2);
 * //=>
 * // Column {
 * //    name: "colName"
 * //    mod: ":csv"
 * // }
 *
 * // creating a column from a configurator:
 * var col3 = new Column({
 *     name: 'colName', // required
 *     prop: 'propName', // optional
 *     mod: '^', // optional
 *     def: 123 // optional
 * });
 * console.log(col3);
 * //=>
 * // Column {
 * //    name: "colName"
 * //    prop: "propName"
 * //    mod: "^"
 * //    def: 123
 * // }
 *
 */
function Column(col) {

    if (!(this instanceof Column)) {
        return new Column(col);
    }

    if (typeof col === 'string') {
        var tmp = stripCnd(col);
        if (col !== tmp) {
            this.cnd = true;
            col = tmp;
        }
        var mod = col.match(/\^|~|#|:raw|:name|:json|:csv|:value/);
        if (mod) {
            this.name = col.substr(0, mod.index);
            this.mod = mod[0];
        } else {
            this.name = col;
        }
    } else {
        if (col && typeof col === 'object') {
            if ('name' in col) {
                this.name = col.name; // column name + property name (if 'prop' isn't specified)
            }
            if ('prop' in col) {
                this.prop = col.prop; // optional property name (if different from the columns name);
            }
            if (col.mod && typeof col.mod === 'string') {
                this.mod = col.mod; // optional format modifier;
            }
            if ($npm.utils.isText(col.cast)) {
                this.cast = getCastName(col.cast); // optional SQL type casting
            }
            if ('cnd' in col) {
                this.cnd = !!col.cnd;
            }
            if ('def' in col) {
                this.def = col.def; // optional default
            }
            if (typeof col.init === 'function') {
                this.init = col.init; // optional value override (overrides 'def' also)
            }
            if (typeof col.skip === 'function') {
                this.skip = col.skip;
            }
        } else {
            throw new TypeError("A column must be a string or a configurator object.");
        }
    }

    if (!$npm.utils.isText(this.name)) {
        throw new TypeError("A column name must be a non-empty text string.");
    }

    if ('prop' in this && !$npm.utils.isText(this.prop)) {
        throw new TypeError("A property name must be a non-empty text string.");
    }

    this.variable = '${' + (this.prop || this.name) + (this.mod || '') + '}';

    this.castText = this.cast ? ('::' + this.cast) : '';

    this.escapedName = $npm.formatting.as.name(this.name);

    Object.freeze(this);

}

function getCastName(name) {
    var idx = 0;
    while (idx < name.length && name[idx] === ':') {
        idx++;
    }
    return idx ? name.substr(idx) : name;
}

function stripCnd(name) {
    var idx = 0;
    while (idx < name.length && name[idx] === '?') {
        idx++;
    }
    return idx ? name.substr(idx) : name;
}

/**
 * @method helpers.Column.toString
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
Column.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    var gap0 = $npm.utils.messageGap(level),
        gap1 = $npm.utils.messageGap(level + 1),
        lines = [
            gap0 + 'Column {',
            gap1 + 'name: ' + JSON.stringify(this.name)
        ];
    if ('prop' in this) {
        lines.push(gap1 + 'prop: ' + JSON.stringify(this.prop));
    }
    if ('mod' in this) {
        lines.push(gap1 + 'mod: ' + JSON.stringify(this.mod));
    }
    if ('cast' in this) {
        lines.push(gap1 + 'cast: ' + JSON.stringify(this.cast));
    }
    if ('cnd' in this) {
        lines.push(gap1 + 'cnd: ' + JSON.stringify(this.cnd));
    }
    if ('def' in this) {
        lines.push(gap1 + 'def: ' + JSON.stringify(this.def));
    }
    if ('init' in this) {
        lines.push(gap1 + 'init: [Function]');
    }
    if ('skip' in this) {
        lines.push(gap1 + 'skip: [Function]');
    }
    lines.push(gap0 + '}');
    return lines.join($npm.os.EOL);
};

Column.prototype.inspect = function () {
    return this.toString();
};

/**
 * @typedef helpers.ColumnConfig
 * @description
 * A simple structure with column details, to be passed into the {@link helpers.Column Column} constructor for initialization.
 *
 * @property {String} name
 * Destination column name + source property name (if `prop` is skipped). The name must adhere to JavaScript syntax for variables,
 * unless `prop` is specified, in which case `name` represents only the column name, and therefore can be any string.
 *
 * @property {String} [prop]
 * Source property name, if different from the column's name. It must adhere to JavaScript syntax for variables.
 *
 * @property {String} [mod]
 * Formatting modifier, as supported by method {@link formatting.format as.format}: `^`, `~`, `#`, `:csv`, `:json`, `name`, `raw`, `:value`.
 *
 * @property {String} [cast]
 * Server-side type casting. Leading `::` is allowed, but not needed (automatically removed when specified).
 *
 * @property {Boolean} [cnd]
 * Used by updates only, it means the column's value is not to be updated, and it is only for use within an update
 * condition (for multi-object updates).
 *
 * @property {} [def]
 * Default value for the property, to be used only when the source object doesn't have the property.
 *
 * @property {helpers.initCB} [init]
 * Override callback for the value.
 *
 * @property {helpers.skipCB} [skip]
 * Used by single-object updates only, to allow skipping columns based on a condition.
 *
 * It is ignored for conditional columns (when `cnd` is set to `true`).
 *
 */

/**
 * @callback helpers.initCB
 * @description
 * A callback function type used by parameter `init` within {@link helpers.ColumnConfig ColumnConfig}.
 *
 * It works as an override for the corresponding property value in the source object.
 *
 * The function is called with `this` set to the source object.
 *
 * @param {} value
 * Value of the property within the source object.
 *
 * If the source object doesn't have the property, and `def` option was specified,
 * then the `value` is set to the `def` value.
 *
 * @returns {}
 * The new value to be used for the corresponding column.
 */

/**
 * @callback helpers.skipCB
 * @description
 * A callback function type used by parameter `skip` within {@link helpers.ColumnConfig ColumnConfig}.
 *
 * It is to dynamically determine if the property is to be skipped from the update.
 *
 * The function is called with `this` set to the source object.
 *
 * @param {String} name
 * Name of the property within the source object.
 *
 * It can be used when implementing a generic verification callback to skip columns bases on a certain rule.
 *
 * @returns {Boolean}
 * A truthy value that indicates whether the column is to be skipped.
 *
 */

module.exports = Column;
