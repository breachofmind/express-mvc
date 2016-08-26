"use strict";
var _ = require('lodash');
var mvc = require('../../index');
var Provider = mvc.Provider;

/**
 * Provides mongoose model blueprints.
 * @author Mike Adamczyk <mike@bom.us>
 */
class ModelProvider extends Provider
{
    constructor()
    {
        super('model');

        this.requires('database');
    }

    register(app)
    {
        var db = app.db;
        var utils = app.utils;
        var modelPath = app.rootPath(app.conf('models_path',' models') + "/");
        var blueprints = {};

        class ModelFactory {

            constructor(name, boot)
            {
                this._schema = null;

                this.name     = name;
                this.slug     = _.snakeCase(name);
                this.title    = "id";
                this.expose   = true;
                this.guarded  = [];
                this.fillable = [];
                this.appends  = [];
                this.populate = [];
                this.labels   = {};
                this.key      = "id";
                this.sort     = 1;

                boot.call(this);
                this._setJsonMethod();
                this.model = db.model(this.name, this._schema);

                // Store the object instances.
                blueprints[this.slug] = this;
                ModelFactory[this.name] = this.model;
            }

            /**
             * Get the sorting range.
             * @returns {{}}
             */
            get range()
            {
                var out = {}; out[this.key] = this.sort;
                return out;
            }

            /**
             * Set the model schema.
             * @param object
             */
            set schema(object) {
                this.fillable = Object.keys(object);
                this._schema = new db.Schema(object);
            }

            /**
             * Get the model schema.
             * @returns {*}
             */
            get schema() {
                return this._schema;
            }

            /**
             * Set the schema methods.
             * @param object
             */
            set methods(object) {
                this._schema.methods = object;
            }

            /**
             * Get the schema methods.
             * @returns {*}
             */
            get methods() {
                return this._schema.methods;
            }

            /**
             * Get the datatype for this key.
             * @returns {*}
             */
            get keyType() {
                return this._schema.tree[this.key].type;
            }

            /**
             * Return an object for a filter query.
             * @param value string from ?p
             * @returns {{}}
             */
            paging(value)
            {
                var q = {};
                q[this.key] = this.sort == 1
                    ? {$gt:value}
                    : {$lt:value};
                return q;
            }

            /**
             * Sets the schema json output.
             * @private
             * @returns void
             */
            _setJsonMethod()
            {
                var self = this;

                this.methods.toJSON = function()
                {
                    var out = {};
                    var model = this;

                    self.fillable.forEach(function(column)
                    {
                        // Skip fields that are in the guarded column.
                        if (self.guarded.indexOf(column) > -1) {
                            return;
                        }
                        return out[column] = model[column];
                    });

                    // The developer can append other columns to the output.
                    self.appends.forEach(function(column)
                    {
                        if (typeof column == 'function') {
                            var arr = column(model,self);
                            if (arr) {
                                return out[arr[0]] = arr[1];
                            }
                        }
                        if (typeof model[column] == "function") {
                            return out[column] = model[column] ();
                        }
                    });

                    out['id'] = model._id;
                    out['_title'] = out[self.title];
                    out['_url'] = app.url(`api/v1/${self.name.toLowerCase()}/${model._id}`);

                    return out;
                }
            }


            /**
             * Load all application models.
             * @returns {*}
             */
            static loadAll()
            {
                var items = utils.getFileBaseNames(modelPath);
                var loaded = [];

                items.forEach(function(name)
                {
                    if (ModelFactory.get(name)) {
                        loaded.push(ModelFactory.get(name));
                        return;
                    }
                    require(modelPath + name) (ModelFactory, app);

                    loaded.push(ModelFactory.get(name));

                    app.logger.debug('[Model] Loaded: %s', name);
                });

                return loaded.length == 1 ? loaded[0] : loaded;
            }

            /**
             * Return a ModelFactory object.
             * @param name string
             * @returns {*|null}
             */
            static get(name) {
                return blueprints[name] || null;
            }

            /**
             * Return all blueprints.
             * @returns {{}}
             */
            static all() {
                return blueprints;
            }

            /**
             * Check if a model exists.
             * @param name string
             * @returns {boolean}
             */
            static has(name) {
                return ModelFactory.get(name) ? true:false;
            }
        }

        ModelFactory.types = db.Schema.Types;

        ModelFactory.loadAll();

        // Attach the factory class to the application.
        app.ModelFactory = ModelFactory;

        mvc.Model = ModelFactory;
    }
}

module.exports = new ModelProvider();