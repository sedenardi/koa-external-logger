
# koa-external-logger

Fork of [koa-logger](https://github.com/koajs/logger) that exposes the logging information for storage and/or processing.

___Notice: `koa-external-logger@2` supports `koa@2`; if you want to use this module with `koa@1`, please use `koa-external-logger@1`.___

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
const logger = require('koa-external-logger')
const Koa = require('koa')

const app = new Koa()
app.use(logger({
  externalLogger: async function(logObj) {
    //perform some action or await to another promise
  },
  consoleEnabled: process.env.NODE_ENV !== 'production'
}))
```

## Options

* `externalLogger` - optional - Async function/promise that takes a logging object as a parameter.
* `consoleEnabled` - optional, default: true - If set to false, nothing will be sent to console.log.
* `truncateUrlQuery` - optional, default: false - If set, the query portion of the URL sent to console.log will be truncated to the first 20 characters (to not pollute the console).

## Log Object

* `time` - Unix time in ms of the start of the request.
* `originalUrl` - Requested URL.
* `status` - HTTP status code.
* `duration` - Duration of request in ms.
* `length` - Length of response in bytes. This will be 0 if it's an error.
* `context` - [koa context object](https://github.com/koajs/koa/blob/master/docs/api/context.md) reference.
* `error` - Error object.

## Notes

  Recommended that you `.use()` this middleware near the top
  to "wrap" all subsequent middleware.

## License

  MIT
