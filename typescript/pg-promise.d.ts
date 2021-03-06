////////////////////////////////////////
// Requires pg-promise v4.0.12 or later.
////////////////////////////////////////

/// <reference path='./pg-subset' />
/// <reference path='./pg-minify' />
/// <reference path='./ext-promise' />

declare module 'pg-promise' {

    import * as pg from 'pg-subset';
    import * as pgMinify from 'pg-minify';
    import XPromise = require('ext-promise'); // External Promise Provider

    type TQueryFileOptions= {
        debug?:boolean,
        minify?:boolean|'after',
        compress?:boolean,
        params?:any
    };

    type TFormattingOptions = {
        partial?:boolean
    };

    type TPreparedBasic = {
        name:string,
        text:string,
        values?:Array<any>,
        binary?:boolean,
        rowMode?:string,
        rows?:number
    };

    type TParameterizedBasic = {
        text:string,
        values?:Array<any>,
        binary?:boolean,
        rowMode?:string
    };

    type TPrepared = {
        name:string,
        text:string|pgPromise.QueryFile,
        values?:Array<any>,
        binary?:boolean,
        rowMode?:string,
        rows?:number
    };

    type TParameterized = {
        text:string|pgPromise.QueryFile,
        values?:Array<any>,
        binary?:boolean,
        rowMode?:string
    };

    type TQuery = string|pgPromise.QueryFile|TPrepared|TParameterized|pgPromise.PreparedStatement|pgPromise.ParameterizedQuery;

    type TColumnConfig = {
        name:string,
        prop?:string,
        mod?:string,
        cast?:string,
        cnd?:boolean,
        def?:any,
        init?:(value:any)=>any,
        skip?:(name:string)=>boolean;
    };

    type TColumnSetOptions = {
        table?:string|TTable|TableName,
        inherit?:boolean
    };

    type TUpdateOptions = {
        tableAlias?:string,
        valueAlias?:string
    };

    type TTable = {
        table:string,
        schema?:string
    };

    type TQueryColumns = Column|ColumnSet|Array<string|TColumnConfig|Column>;

    // Base database protocol
    // API: http://vitaly-t.github.io/pg-promise/Database.html
    interface IBaseProtocol<Ext> {

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.query
        query(query:TQuery, values?:any, qrm?:pgPromise.queryResult):XPromise<any>;

        // result-specific methods;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.none
        none(query:TQuery, values?:any):XPromise<void>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.one
        one(query:TQuery, values?:any):XPromise<any>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.oneOrNone
        oneOrNone(query:TQuery, values?:any):XPromise<any>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.many
        many(query:TQuery, values?:any):XPromise<Array<any>>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.manyOrNone
        manyOrNone(query:TQuery, values?:any):XPromise<Array<any>>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.any
        any(query:TQuery, values?:any):XPromise<Array<any>>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.result
        result(query:TQuery, values?:any):XPromise<pg.IResult>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.stream
        stream(qs:Object, init:(stream:Object)=>void):XPromise<{processed:number, duration:number}>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.func
        func(funcName:string, values?:any, qrm?:pgPromise.queryResult):XPromise<any>;

        // API: http://vitaly-t.github.io/pg-promise/Database.html#.proc
        proc(procName:string, values?:any):XPromise<any>;

        // Tasks
        // API: http://vitaly-t.github.io/pg-promise/Database.html#.task
        task(cb:(t:ITask<Ext>&Ext)=>any):XPromise<any>;
        task(tag:any, cb:(t:ITask<Ext>&Ext)=>any):XPromise<any>;

        // Transactions
        // API: http://vitaly-t.github.io/pg-promise/Database.html#.tx
        tx(cb:(t:ITask<Ext>&Ext)=>any):XPromise<any>;
        tx(tag:any, cb:(t:ITask<Ext>&Ext)=>any):XPromise<any>;
    }

    // Database object in connected state;
    interface IConnected<Ext> extends IBaseProtocol<Ext> {
        done():void;
    }

    // Additional methods available inside tasks + transactions;
    // API: http://vitaly-t.github.io/pg-promise/Task.html
    interface ITask<Ext> extends IBaseProtocol<Ext> {

        // SPEX API: https://github.com/vitaly-t/spex/blob/master/docs/code/batch.md
        batch(values:Array<any>, cb?:(index:number, success:boolean, result:any, delay:number)=>any):XPromise<Array<any>>;
        batch(values:Array<any>, options:{cb?:(index:number, success:boolean, result:any, delay:number)=>any}):XPromise<Array<any>>;

        // SPEX API: https://github.com/vitaly-t/spex/blob/master/docs/code/page.md
        page(source:(index:number, data:any, delay:number)=>any, dest?:(index:number, data:any, delay:number)=>any, limit?:number):XPromise<{pages:number, total:number, duration:number}>;
        page(source:(index:number, data:any, delay:number)=>any, options:{dest?:(index:number, data:any, delay:number)=>any, limit?:number}):XPromise<{pages:number, total:number, duration:number}>;

        // SPEX API: https://github.com/vitaly-t/spex/blob/master/docs/code/sequence.md
        sequence(source:(index:number, data:any, delay:number)=>any, dest?:(index:number, data:any, delay:number)=>any, limit?:number, track?:boolean):XPromise<any>;
        sequence(source:(index:number, data:any, delay:number)=>any, options:{dest?:(index:number, data:any, delay:number)=>any, limit?:number, track?:boolean}):XPromise<any>;

        // API: http://vitaly-t.github.io/pg-promise/Task.html#.ctx
        ctx:ITaskContext;
    }

    // Query formatting namespace;
    // API: http://vitaly-t.github.io/pg-promise/formatting.html
    interface IFormatting {

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.array
        array(arr:Array<any>|(()=>Array<any>)):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.bool
        bool(value:any|(()=>any)):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.buffer
        buffer(obj:Object|(()=>Object), raw?:boolean):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.csv
        csv(values:any|(()=>any)):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.date
        date(d:Date|(()=>Date), raw?:boolean):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.format
        format(query:string, values?:any, options?:TFormattingOptions):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.func
        func(func:()=>any, raw?:boolean, obj?:Object):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.json
        json(obj:any|(()=>any), raw?:boolean):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.name
        name(name:string|(()=>string)):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.number
        number(value:number|(()=>number)):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.text
        text(value:any|(()=>any), raw?:boolean):string;

        // API: http://vitaly-t.github.io/pg-promise/formatting.html#.value
        value(value:any|(()=>any)):string;
    }

    // Event context extension for tasks + transactions;
    // See: http://vitaly-t.github.io/pg-promise/global.html#event:query
    interface ITaskContext {
        isTX:boolean;
        start:Date;
        finish:Date;
        tag:any;
        dc:any;
        success:boolean;
        result:any;
        context:Object;
    }

    // Generic Event Context interface;
    // See: http://vitaly-t.github.io/pg-promise/global.html#event:query
    interface IEventContext {
        client:pg.Client;
        cn:any;
        dc:any;
        query:any;
        params:any;
        ctx:ITaskContext;
    }

    // Database connection configuration interface;
    // See: https://github.com/brianc/node-postgres/blob/master/lib/connection-parameters.js#L36
    interface IConfig {
        host?:string,
        port?:number,
        database:string,
        user?:string,
        password?:string,
        ssl?:boolean,
        binary?:boolean,
        client_encoding?:string,
        application_name?:string,
        fallback_application_name?:string
    }

    // Transaction Isolation Level;
    // API: http://vitaly-t.github.io/pg-promise/global.html#isolationLevel
    enum isolationLevel{
        none = 0,
        serializable = 1,
        repeatableRead = 2,
        readCommitted = 3
    }

    // TransactionMode class;
    // API: http://vitaly-t.github.io/pg-promise/TransactionMode.html
    class TransactionMode {
        constructor(tiLevel?:isolationLevel, readOnly?:boolean, deferrable?:boolean);
        constructor(options:{tiLevel?:isolationLevel, readOnly?:boolean, deferrable?:boolean});
    }

    // QueryResultError class;
    // API: http://vitaly-t.github.io/pg-promise/QueryResultError.html
    interface IQueryResultError extends Error {

        // standard error properties:
        name:string;
        message:string;
        stack:string;

        // extended properties:
        result:pg.IResult;
        received:number;
        code:queryResultErrorCode;
        query:string;
        values:any;

        // API: http://vitaly-t.github.io/pg-promise/QueryResultError.html#.toString
        toString():string;
    }

    // QueryFileError class;
    // API: http://vitaly-t.github.io/pg-promise/QueryFileError.html
    interface IQueryFileError extends Error {

        // standard error properties:
        name:string;
        message:string;
        stack:string;

        // extended properties:
        file:string;
        options:TQueryFileOptions;
        error:pgMinify.SQLParsingError;

        // API: http://vitaly-t.github.io/pg-promise/QueryFileError.html#.toString
        toString():string;
    }

    // PreparedStatementError class;
    // API: http://vitaly-t.github.io/pg-promise/PreparedStatementError.html
    interface IPreparedStatementError extends Error {

        // standard error properties:
        name:string;
        message:string;
        stack:string;

        // extended properties:
        error:IQueryFileError;

        // API: http://vitaly-t.github.io/pg-promise/PreparedStatementError.html#.toString
        toString():string;
    }

    // ParameterizedQueryError class;
    // API: http://vitaly-t.github.io/pg-promise/ParameterizedQueryError.html
    interface IParameterizedQueryError extends Error {

        // standard error properties:
        name:string;
        message:string;
        stack:string;

        // extended properties:
        error:IQueryFileError;

        // API: http://vitaly-t.github.io/pg-promise/ParameterizedQueryError.html#.toString
        toString():string;
    }

    // Query Result Error Code;
    // API: http://vitaly-t.github.io/pg-promise/global.html#queryResultErrorCode
    enum queryResultErrorCode {
        noData = 0,
        notEmpty = 1,
        multiple = 2
    }

    // Errors namespace
    // API: http://vitaly-t.github.io/pg-promise/errors.html
    interface IErrors {
        QueryResultError:IQueryResultError;
        queryResultErrorCode:typeof queryResultErrorCode;
        QueryFileError:IQueryFileError;
        PreparedStatementError:IPreparedStatementError;
        ParameterizedQueryError:IParameterizedQueryError;
    }

    // Transaction Mode namespace;
    // API: http://vitaly-t.github.io/pg-promise/txMode.html
    interface ITXMode {
        isolationLevel:typeof isolationLevel,
        TransactionMode:typeof TransactionMode
    }

    // helpers.TableName class;
    // API: http://vitaly-t.github.io/pg-promise/helpers.TableName.html
    class TableName {
        constructor(table:string, schema?:string);
        constructor(table:TTable);

        // these are all read-only:
        name:string;
        table:string;
        schema:string;

        // API: http://vitaly-t.github.io/pg-promise/helpers.TableName.html#.toString
        toString():string;
    }

    // helpers.Column class;
    // API: http://vitaly-t.github.io/pg-promise/helpers.Column.html
    class Column {
        constructor(col:string|TColumnConfig);

        // these are all read-only:
        name:string;
        prop:string;
        mod:string;
        cast:string;
        cnd:boolean;
        def:any;

        init:(value:any)=>any;
        skip:(name:string)=>boolean;

        // API: http://vitaly-t.github.io/pg-promise/helpers.Column.html#.toString
        toString():string;
    }

    // helpers.Column class;
    // API: http://vitaly-t.github.io/pg-promise/helpers.ColumnSet.html
    class ColumnSet {
        constructor(columns:Column, options?:TColumnSetOptions);
        constructor(columns:Array<string|TColumnConfig|Column>, options?:TColumnSetOptions);
        constructor(columns:Object, options?:TColumnSetOptions);

        // these are all read-only:
        columns:Array<Column>;
        names:Array<string>;
        updates:Array<string>;
        variables:Array<string>;
        table:TableName;

        canUpdate(data:Object|Array<Object>):boolean;

        prepare(obj:Object):Object;

        // API: http://vitaly-t.github.io/pg-promise/helpers.ColumnSet.html#.toString
        toString():string;
    }

    // Query Formatting Helpers
    // API: http://vitaly-t.github.io/pg-promise/helpers.html
    interface IHelpers {

        insert(data:Object|Array<Object>, columns?:TQueryColumns, table?:string|TTable|TableName):string;
        update(data:Object|Array<Object>, columns?:TQueryColumns, table?:string|TTable|TableName, options?:TUpdateOptions):string;

        Column:typeof Column;
        ColumnSet:typeof ColumnSet;
        TableName:typeof TableName;
    }

    // Post-initialization interface;
    // API: http://vitaly-t.github.io/pg-promise/module-pg-promise.html
    interface IMain {
        (cn:string|IConfig, dc?:any):pgPromise.IDatabase<IEmptyExt>,
        <T>(cn:string|IConfig, dc?:any):pgPromise.IDatabase<T>&T,
        PromiseAdapter:typeof pgPromise.PromiseAdapter;
        PreparedStatement:typeof pgPromise.PreparedStatement;
        ParameterizedQuery:typeof pgPromise.ParameterizedQuery;
        QueryFile:typeof pgPromise.QueryFile;
        queryResult:typeof pgPromise.queryResult;
        minify:typeof pgMinify,
        errors:IErrors;
        txMode:ITXMode;
        helpers:IHelpers;
        as:IFormatting;
        end():void,
        pg:typeof pg;
    }

    // Empty Extensions
    interface IEmptyExt {

    }

    // Main protocol of the library;
    // API: http://vitaly-t.github.io/pg-promise/module-pg-promise.html
    namespace pgPromise {
        var minify:typeof pgMinify;

        // Query Result Mask;
        // API: http://vitaly-t.github.io/pg-promise/global.html#queryResult
        enum queryResult {
            one = 1,
            many = 2,
            none = 4,
            any = 6
        }

        // PreparedStatement class;
        // API: http://vitaly-t.github.io/pg-promise/PreparedStatement.html
        class PreparedStatement {

            // API: http://vitaly-t.github.io/pg-promise/PreparedStatement.html
            constructor(name:string, text:string|QueryFile, values?:Array<any>);
            constructor(obj:PreparedStatement);
            constructor(obj:TPrepared);

            // standard properties:
            name:string;
            text:string;
            values:Array<any>;

            // advanced properties:
            binary:boolean;
            portal:string;
            rowMode:string;
            rows:any;
            stream:any;
            types:any;

            // API: http://vitaly-t.github.io/pg-promise/PreparedStatement.html#.parse
            parse():TPreparedBasic|IPreparedStatementError;

            // API: http://vitaly-t.github.io/pg-promise/PreparedStatement.html#.toString
            toString():string;
        }

        // ParameterizedQuery class;
        // API: http://vitaly-t.github.io/pg-promise/ParameterizedQuery.html
        class ParameterizedQuery {

            // API: http://vitaly-t.github.io/pg-promise/ParameterizedQuery.html
            constructor(text:string|QueryFile, values?:Array<any>);
            constructor(obj:ParameterizedQuery);
            constructor(obj:TParameterized);

            // standard properties:
            text:string;
            values:Array<any>;

            // advanced properties:
            binary:boolean;
            portal:string;
            rowMode:string;
            rows:any;
            stream:any;
            types:any;

            // API: http://vitaly-t.github.io/pg-promise/ParameterizedQuery.html#.parse
            parse():TParameterizedBasic|IParameterizedQueryError;

            // API: http://vitaly-t.github.io/pg-promise/ParameterizedQuery.html#.toString
            toString():string;
        }

        // QueryFile class;
        // API: http://vitaly-t.github.io/pg-promise/QueryFile.html
        class QueryFile {

            // API: http://vitaly-t.github.io/pg-promise/QueryFile.html
            constructor(file:string, options?:TQueryFileOptions);

            // API: http://vitaly-t.github.io/pg-promise/QueryFile.html#error
            error:Error;

            // API: http://vitaly-t.github.io/pg-promise/QueryFile.html#file
            file:string;

            // API: http://vitaly-t.github.io/pg-promise/QueryFile.html#options
            options:any;

            // API: http://vitaly-t.github.io/pg-promise/QueryFile.html#query
            query:string;

            // API: http://vitaly-t.github.io/pg-promise/QueryFile.html#.prepare
            prepare():void;

            // API: http://vitaly-t.github.io/pg-promise/QueryFile.html#.toString
            toString():string;
        }

        // PromiseAdapter class;
        // API: http://vitaly-t.github.io/pg-promise/PromiseAdapter.html
        class PromiseAdapter {
            constructor(create:(cb:any)=>Object, resolve:(data:any)=>void, reject:(reason:any)=>void);
        }

        var txMode:ITXMode;
        var errors:IErrors;
        var as:IFormatting;

        // Database full protocol;
        // API: http://vitaly-t.github.io/pg-promise/Database.html
        //
        // We export this interface only to be able to help IntelliSense cast extension types correctly,
        // which doesn't always work, depending on the version of IntelliSense being used. 
        interface IDatabase<Ext> extends IBaseProtocol<Ext> {
            connect():XPromise<IConnected<Ext>>;
        }

    }

    // Library's Initialization Options
    // API: http://vitaly-t.github.io/pg-promise/module-pg-promise.html
    interface IOptions<Ext> {
        pgFormatting?:boolean;
        pgNative?:boolean,
        promiseLib?:any;
        connect?:(client:pg.Client, dc:any) => void;
        disconnect?:(client:pg.Client, dc:any) => void;
        query?:(e:IEventContext) => void;
        receive?:(data:Array<any>, result:pg.IResult, e:IEventContext) => void;
        task?:(e:IEventContext) => void;
        transact?:(e:IEventContext) => void;
        error?:(err:any, e:IEventContext) => void;
        extend?:(obj:pgPromise.IDatabase<Ext>&Ext, dc:any) => void;
        noLocking?:boolean;
        capSQL?:boolean;
    }

    // Default library interface (before initialization)
    // API: http://vitaly-t.github.io/pg-promise/module-pg-promise.html
    function pgPromise(options?:IOptions<IEmptyExt>):IMain;
    function pgPromise<Ext>(options?:IOptions<Ext>):IMain;

    export=pgPromise;
}
