"use strict";

var core         = require('../core'),
    express      = require('express'),
    locale       = require('locale'),
    bodyParser   = require('body-parser'),
    session      = require('express-session'),
    csrf         = require('csurf'),
    flash        = require('connect-flash'),
    cookieParser = require('cookie-parser'),
    Provider     = require('../provider'),
    MongoStore   = require('connect-mongo')(session);

/**
 * Provides the express server and core middleware.
 * @author Mike Adamczyk <mike@bom.us>
 */
class ExpressProvider extends Provider
{
    constructor()
    {
        super('express');

        this.order = 10;
        this.requires([
            'logger',
            'view',
            'url'
        ]);

        this.inject('Log');

        this.middlewareStack = [
            /**
             * The core middleware.
             * @param app
             */
            function coreMiddleware(app)
            {
                return core(app);
            },

            /**
             * Checks if the request originated
             * from an ajax request.
             * @param app
             */
            function ajaxMiddleware(app)
            {
                return function(request,response,next)
                {
                    request.ajax = request.get('x-requested-with') === 'XMLHttpRequest';
                    next();
                }
            },

            /**
             * Adds localization support.
             * @param app
             */
            function localeMiddleware (app)
            {
                app.express.use(locale(app.conf('lang_support', ['en_US'])));

                return function (request,response,next)
                {
                    if (request.query.cc) {
                        request.locale = request.query.cc.toLowerCase();
                    }
                    next();
                }
            },

            /**
             * Serves static content, if configured.
             * @param app
             */
            function staticContentMiddleware (app)
            {
                if (app.conf('static_path')) {
                    app.get('Log').debug('[Express] Using static path: %s', app.path('static_path'));
                    return express.static(app.path('static_path'));
                }
            },

            /**
             * Parses the body response.
             * @param app
             */
            function bodyParserMiddleware(app)
            {
                app.express.use(bodyParser.json());
                app.express.use(bodyParser.urlencoded({extended:true}));
                app.express.use(cookieParser(app.conf('appKey', "keyboard cat")));
            },

            /**
             * Sets up the session middleware.
             * @param app
             */
            function sessionMiddleware (app)
            {
                var conn = app.get('db').connection;
                return session ({
                    secret: app.conf('appKey', 'keyboard cat'),
                    saveUninitialized: false,
                    resave: false,
                    store: new MongoStore({
                        mongooseConnection: conn
                    })
                });
            },

            /**
             * Adds flash message support.
             * @param app
             */
            function flashMiddleware(app)
            {
                app.express.use(flash());
            }
        ]
    }

    register(app,logger)
    {
        var config = app.config;
        var self = this;

        app.express = express();
        app._middlewares = [];

        app.register('Express', app.express);

        /**
         * Called before the server starts.
         * @param app Application
         */
        function bootstrap(app)
        {
            app.express.set('view engine', app.conf('view_engine', 'ejs'));
            app.express.set('views', app.rootPath(app.conf('views_path', 'resources/views')));

            // Install the default middleware.
            self.middlewareStack.forEach(function(func)
            {
                logger.debug('[Express] Adding Application Middleware: %s', func.name);
                app._middlewares.push(func.name);
                var use = func(app);
                if (use) app.express.use(use);

            });
        }

        /**
         * Called when the server is ready to start.
         * @param app Application
         */
        function server(app)
        {
            app.express.listen(config.port, function()
            {
                logger.info('[Express] Using root path: %s', app.rootPath());
                logger.info(`[Express] Starting %s server v.%s on %s (%s)...`,
                    app.env,
                    app._version,
                    app.conf('url'),
                    app.url());

                app.event.emit('express.listening', app.express);
            });
        }

        app.event.on('application.bootstrap', bootstrap);

        app.event.on('application.server', server)
    }

    /**
     * Add to the middleware stack.
     * @param func function
     * @returns ExpressProvider
     */
    middleware(func)
    {
        this.middlewareStack.push(func);
        return this;
    }
}

module.exports = new ExpressProvider();