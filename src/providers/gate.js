"use strict";
var Provider = require('../provider');

/**
 * The gate class.
 * Checks user permissions via policies.
 * @constructor
 */
function Gate(app, permissions)
{
    Object.defineProperty(this, 'permissions', {
        get: function() {
            return permissions;
        }
    });

    var policies = [];

    /**
     * Add a gate to the queue.
     * @param policy function
     * @returns Gate
     */
    this.policy = function(policy)
    {
        if (typeof policy == 'function') {
            policies.push(policy);
        }
        return this;
    };

    /**
     * Check if the gate has the permission stored.
     * @param key
     * @returns {*|boolean}
     */
    this.contains = function(key)
    {
        return permissions.indexOf(key) > -1;
    };

    /**
     * Check if a user has permission.
     * @param user User model
     * @param object string
     * @param action string
     * @returns {boolean}
     */
    this.check = function(user,object,action)
    {
        for (let i=0; i<policies.length; i++)
        {
            var passed = policies[i].call(this,user,object,action);
            if (typeof passed === 'boolean') {
                return passed;
            }
        }
        return true;
    };
}




/**
 * Provides a gate that checks user permissions.
 * @author Mike Adamczyk <mike@bom.us>
 */
class GateProvider extends Provider
{
    constructor()
    {
        super('gate');

        this.requires([
            'logger',
            'database',
            'auth',
            'model'
        ]);

        // CLI doesn't need permissions.
        this.inside([ENV_LOCAL,ENV_DEV,ENV_PROD,ENV_TEST]);
    }

    register(app)
    {
        // Permission index.
        var permissions = buildPermissions();

        /**
         * Stores the permission index.
         * This comes from basic CRUD operations for each model.
         */
        function buildPermissions()
        {
            var items = ['superuser'];
            var crud = ['create','read','update','delete'];
            app.ModelFactory.each(function(model) {
                crud.map(function(action){ items.push(`${model.name}.${action}`); });
                if (model.managed) {
                    items.push(`${model.name}.manage`);
                }
            });
            return items;
        }


        app.gate = new Gate(app, permissions);

        // Does the user have a superuser status?
        app.gate.policy(function(user,object,action)
        {
            if (user.is('superuser')) {
                return true;
            }
        });

        // Model object policies.
        app.gate.policy(function(user,object,action)
        {
            if (object instanceof app.ModelFactory.Model) {
                var key = `${object.name}.${action}`;
                // If the permission doesn't exist, allow by default.
                if (! this.contains(key)) {
                    return true;
                }
                // TODO object.managed

                // Does the user have the permission?
                return user.permissions().indexOf(key) > -1;
            }
        });
    }
}

module.exports = new GateProvider();