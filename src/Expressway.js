"use strict";

var path            = require('path');
var Application     = require('./Application');
var utils           = require('./support/utils');
var _               = require('lodash');

require('./exceptions/ApplicationError');
require('./exceptions/ApplicationCallError');
require('./exceptions/ApplicationLoadError');

/**
 * The Express MVC application.
 * @constructor
 */
class Expressway
{
    constructor(rootPath,configPath=null)
    {
        /**
         * The root path of the application.
         * @type {string}
         * @private
         */
        this._rootPath = rootPath;

        /**
         * Path where configuration files are kept.
         * @type {string}
         * @private
         */
        this._configPath = configPath || rootPath+'config/';

        /**
         * The Application instance.
         * @type {null|Application}
         * @private
         */
        this._app = null;
    }

    /**
     * Create an instance of the Application class.
     * @param context
     * @returns {Expressway}
     */
    createApplication(context = CXT_WEB)
    {
        var appConfig = require(this._configPath + "config");
        var sysConfig = require(this._configPath + "system");

        _.merge(appConfig, sysConfig);

        this._app = new Application(this,appConfig,context);

        return this;
    }

    /**
     * Return the Expressway app instance, if loaded.
     * @returns {Application|null}
     */
    static get app()
    {
        return Expressway.instance.app;
    }

    /**
     * Get the protected Application instance.
     * @returns {null|Application}
     */
    get app()
    {
        return this._app;
    }

    /**
     * Get the root path to a file.
     * @param filePath string
     * @returns {string}
     */
    rootPath(filePath="")
    {
        return path.normalize( this._rootPath + filePath );
    }

    /**
     * Bootstrap the application.
     * @returns {Application}
     */
    bootstrap()
    {
        return this._app.bootstrap();
    }

    /**
     * An alias to the CLI environment.
     * @param rootPath string
     * @returns {Application}
     */
    static cli(rootPath)
    {
        return Expressway.init(rootPath, CXT_CLI).bootstrap();
    }

    /**
     * Create a gulp helper object.
     * @param rootPath string
     * @param gulp Gulp
     * @returns {GulpHelper}
     */
    static gulp(rootPath,gulp)
    {
        let app    = Expressway.cli(rootPath);
        let Helper = require('./support/gulp');

        return new Helper(gulp);
    }

    /**
     * Initialize the application.
     * @param rootPath string
     * @param context string, optional
     * @param configPath string, optional
     * @returns {Expressway}
     */
    static init(rootPath, context, configPath=null)
    {
        let root = _.trimEnd(rootPath,"/") + "/";

        // Return the instance if it exists already.
        if (Expressway.instance) return Expressway.instance;

        var instance = new Expressway(root,configPath);

        instance.createApplication(context);

        return Expressway.instance = instance;
    }

    /**
     * Start the express server with default settings or run the cli.
     * @param rootPath string
     * @param listen function, optional
     * @returns {*}
     */
    static start(rootPath, listen)
    {
        // We can call the command line interface from here.
        // node index cli <command> [options]
        if (process.argv[2] == 'cli')
        {
            process.argv.splice(2,1);
            var cli = Expressway.cli(rootPath).get('cli');
            return cli.run(process.argv);
        }

        // Calling node index will run the server.
        return Expressway.init(rootPath).bootstrap().server(listen);
    }
}


Expressway.instance         = null;
Expressway.Promise          = require('bluebird');
Expressway.Provider         = require('./Provider');
Expressway.Module           = require('./Module');
Expressway.Application      = Application;
Expressway.utils            = utils;

module.exports = Expressway;