"use strict";

var Provider       = require('../Provider');
var ObjectCollection = require('../ObjectCollection');
var Promise = require('bluebird');

module.exports = function(app,debug,utils)
{
    /**
     * A collection of controller instances.
     */
    return new class ProviderService extends ObjectCollection
    {
        constructor()
        {
            super(app,'provider');

            this.class = Provider;

            this.on('boot', (provider) =>
            {
                debug('ProviderService booted: %s', provider.name);
            })
        }

        /**
         * Return a list of providers.
         * Sort by the provider order property if no sort method given.
         * @param sort Function
         * @returns {Array}
         */
        list(sort)
        {
            if (! sort) sort = function(a,b) {
                return a.object.order == b.object.order ? 0 : a.object.order > b.object.order ? 1 : -1;
            };
            return super.list(sort);
        }

        /**
         * Sort and boot each provider that is loadable.
         * @returns {Promise}
         */
        boot()
        {
            let providers = this.list().map(item => {return item.object});

            // This needs to run serially.
            return Promise.each(providers, (provider =>
            {
                return new Promise(resolve =>
                {
                    if (! provider.isLoadable(app.env,app.context) || provider.booted) return resolve();

                    this.app.call(provider,'boot',[resolve]);
                    provider._booted = true;
                    this.emit('boot',provider);
                })
            }));
        }
    }
};