"use strict";

var Model = require('../Model');
var ObjectCollection = require('../ObjectCollection');
var Promise = require('bluebird');

module.exports = function(app,debug)
{
    /**
     * A collection of models.
     */
    return new class ModelService extends ObjectCollection
    {
        constructor()
        {
            super(app,'model');

            this.class = Model;
            this.slugs = {};
            this.createService = true;

            this.on('add', (app,name,value) =>
            {
                this.slugs[value.slug] = value;
                debug('ModelService added: %s -> %s', name, value.slug);
            });

            this.on('boot', (model) =>
            {
                debug('Model booted: %s', model.name);
            })
        }

        /**
         * Boot each model.
         * @returns {Promise}
         */
        boot()
        {
            return Promise.all(this.each(model => {
                return new Promise(resolve => {
                    this.emit('boot',model);
                    this.app.call(model,'boot',[resolve]);
                });
            }));
        }

        /**
         * Get a model by the slug name.
         * @param name string
         * @returns {Model}
         */
        slug(name)
        {
            if (! this.slugs.hasOwnProperty(name)) {
                throw new Error(`slug does not exist: ${name}`);
            }
            return this.slugs[name];
        }
    }
};