"use strict";

var Middleware = require('../Middleware');

/**
 * The default not found 404 handler.
 * Overwrite with a custom function if needed.
 */
class NotFound extends Middleware
{
    get description() {
        return "The default 404 Not Found response";
    }
    method(request,response,next,view)
    {
        if (request.xhr) {
            return 404;
        }
        response.status(404);
        return view.template('error/404');
    }
}

module.exports = NotFound;

