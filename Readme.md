
# koa-external-logger

Fork of [koa-logger](https://github.com/koajs/logger) that exposes the logging information for storage and/or processing.

```
<-- GET /
--> GET / 200 835ms 746b
<-- GET /
--> GET / 200 960ms 1.9kb
<-- GET /users
--> GET /users 200 357ms 922b
<-- GET /users?page=2
--> GET /users?page=2 200 466ms 4.66kb
```

## Installation

```js
$ npm install koa-external-logger
```

## Example

```js
var logger = require('koa-external-logger');
var koa = require('koa');

var app = koa();
app.use(logger({
  externalLogger: function*(logObj) {
    //perform some action or yield to another generator/promise
  },
  consoleEnabled: true
}));
```

## Options

* `externalLogger` - optional - Generator function that takes a logging object as a parameter.
* `consoleEnabled` - optional, default: true - If set to false, nothing will be sent to console.log.

## Log Object

* `time` - Unix time in ms of the start of the request.
* `originalUrl` - Requested URL.
* `status` - HTTP status code.
* `duration` - Duration of request in ms.
* `length` - Length of response in bytes.
* `context` - [koa context object](https://github.com/koajs/koa/blob/master/docs/api/context.md) reference.

## Notes

  Recommended that you `.use()` this middleware near the top
  to "wrap" all subsequent middleware.

## License

  MIT