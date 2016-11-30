"use strict";

var Provider   = require('./Provider');
var Express    = require('express');
var utils      = require('./support/utils');


/**
 * A convenient way of creating sub-applications in express.
 * @constructor
 */
class Module extends Provider {

    constructor(app)
    {
        super(app);

        this.order(50);
        this.requires('ControllerProvider');

        this.express = Express();
        this.options = null;
        this.routes = [];

        this.baseUri = "/";

        app.register(this.name, this, "Express application Module instance");
        if (this.alias) {
            app.register(this.alias, this, "Alias to "+this.name);
        }
    }

    /**
     * Set the parent express module.
     * @param parent Module|string
     */
    parent(parent)
    {
        if (typeof parent == 'string') parent = this.app.get(parent);

        if (! (parent instanceof Module)) {
            throw new TypeError("First argument not instance of Module");
        }
        parent.express.use(this.baseUri, this.express);

        // Inherit the view engine and settings of the parent module.
        // You can always change this at the module provider level.
        var engine = parent.express.get('view engine');

        this.set('view engine', engine)
            .set('views', parent.express.get('views'))
            .engine(engine, parent.engine(engine));
    }

    /**
     * Set a key value in the express app.
     * @param key string
     * @param value mixed
     * @returns {Module}
     */
    set(key,value)
    {
        this.express.set(key,value);

        return this;
    }

    /**
     * Get or set the given engine.
     * @param ext string
     * @param fn Function
     * @returns {Module|Function}
     */
    engine(ext,fn)
    {
        if (! fn) return this.express.engines["."+ext];
        this.express.engine(ext,fn);

        return this;
    }

    /**
     * Default register method.
     * @param app Applicaiton
     * @param config function
     * @param path PathService
     */
    register(app,config,path)
    {
        this.set('views', path.views().get());
        this.set('view engine', config('view_engine','ejs'));
        this.set('env', app.env === ENV_PROD ? 'production' : 'development');
    }

    /**
     * Default boot method.
     * @param app Application
     */
    boot(app)
    {
        this.add("/",this.routes);
    }

    /**
     * Add some routes or middleware.
     * @param base string|object
     * @param routes string|object
     * @returns {Router}
     */
    add(base,routes)
    {
        var controllerService = this.app.get('controllerService');

        // We're passing either a string or array (global middleware) or an object (routes).
        if (arguments.length == 1) {
            routes = base;
            base = "/";
        }

        // Add the router to the express application.
        this.express.use(base,controllerService.getRouteFunctions(routes, this.options));

        return this;
    }

    /**
     * Create a static serving uri.
     * @param uri string
     * @param dir string
     */
    static(uri,dir)
    {
        if (arguments.length == 1) {
            dir = uri;
            uri = "/";
        }
        var route = Express.static(dir.toString());
        route.$dir = dir.toString();

        this.express.use(uri,route);

        return this;
    }

    /**
     * Default server start method.
     * @param app
     * @param config
     * @param url
     * @param path
     * @param log
     */
    serverStart(app,config,url,path,log)
    {
        this.express.listen(config('port'), function()
        {
            log.info('Using root path: %s', path.root().get());
            log.info(`Starting %s server v.%s on %s (%s)...`,
                app.env,
                app.version,
                config('url'),
                url());

            app.emit('express.listening',app);
        });
    }
}


module.exports = Module;