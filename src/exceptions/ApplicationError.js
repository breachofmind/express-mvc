"use strict";

class ApplicationError extends Error
{
    constructor(message,object)
    {
        super(message,1);

        console.error(object);
    }
}

global.ApplicationError = ApplicationError;