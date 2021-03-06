"use strict";

var express = require('express');
var utils   = require('./support/utils');
var _       = require('lodash');
var RouteCollection  = require('./RouteCollection');

class Extension
{
    /**
     * Constructor.
     * @param app Application
     */
    constructor(app)
    {
        this._booted = false;

        /**
         * Application instance.
         * @type {Application}
         */
        this._app = app;

        /**
         * Extensions mounted to this extension.
         * @type {{}}
         */
        this.mounted = {};

        /**
         * Router instance.
         * @type {RouteCollection}
         */
        this._routes = new RouteCollection(this);

        /**
         * The base uri for this extension.
         * @type {string}
         */
        this.base = "/";

        /**
         * Default settings.
         * @type {{}}
         */
        this.defaults = {};

        /**
         * The express instance.
         * @type express
         */
        this.express = express();

        this.express.$extension = this;

        this.express.set('env', app.env === ENV_PROD ? 'production' : 'development');
    }

    /**
     * Get the name of this extension.
     * @returns {String}
     */
    get name()
    {
        return this.constructor.name;
    }

    /**
     * Return the Application instance.
     * @returns {Application}
     */
    get app()
    {
        return this._app;
    }

    /**
     * Get the route collection.
     * @returns {RouteCollection}
     */
    get routes()
    {
        return this._routes;
    }

    /**
     * Mount an extension to this extension.
     * @param extension Extension
     * @param base string
     * @returns {Extension}
     */
    mount(extension,base=null)
    {
        if (! (extension instanceof Extension)) {
            throw new TypeError('must be instance of Extension');
        }
        if (! base) base = extension.base;
        this.express.use(base, extension.express);
        this.mounted[base] = extension;

        // Migrate some settings
        if (! extension.express.get('view engine')) {
            extension.express.set('views', this.express.get('views'));
            extension.express.set('view engine', this.express.get('view engine'));
        }

        return this;
    }

    /**
     * Default boot method.
     * @param next Function
     */
    boot(next)
    {
        this.routes.boot().then(done => {
            this._booted = true;
            next();
        });
    }

    /**
     * Render using the express instance.
     * @param file string
     * @param data object
     * @returns {Promise}
     */
    render(file,data={})
    {
        return new Promise((resolve,reject) =>
        {
            this.express.render(file,data,function(err,str) {
                if (err) return reject(err);
                return resolve(str);
            });
        });
    }

    /**
     * Require a module with the app and extension as dependencies.
     * @param fn Function|String
     * @param args Array
     * @returns {Extension}
     */
    use(fn,args)
    {
        if (Array.isArray(fn)) {
            fn.forEach(item => { this.use(item,args) });
            return this;
        }

        args = _.compact([this.app,this].concat(args));
        this.app.call((typeof fn == 'string' ? require(fn) : fn), null, args);

        return this;
    }
}

module.exports = Extension;