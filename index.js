/**
 * Module dependencies.
 */

var Counter = require('passthrough-counter');
var humanize = require('humanize-number');
var bytes = require('bytes');
var chalk = require('chalk');
var co = require('co');

/**
 * TTY check for dev format.
 */

var isatty = process.stdout.isTTY;

/**
 * Expose logger.
 */

module.exports = dev;

/**
 * Color map.
 */

var colorCodes = {
  5: 'red',
  4: 'yellow',
  3: 'cyan',
  2: 'green',
  1: 'green'
};

/**
 * Development logger.
 */

function dev(opts) {
  opts = opts || {};
  opts.consoleEnabled = typeof opts.consoleEnabled === 'boolean' ? 
    opts.consoleEnabled : true;
  opts.externalLogger = opts.externalLogger || null;

  return function *logger(next) {
    // request
    var start = Date.now();
    if (opts.consoleEnabled) {
      console.log('  ' + chalk.gray('<--')
        + ' ' + chalk.bold('%s')
        + ' ' + chalk.gray('%s'),
          this.method,
          this.originalUrl);  
    }    

    try {
      yield next;
    } catch (err) {
      // log uncaught downstream errors
      yield log(this, start, null, err, null, opts);
      throw err;
    }

    // calculate the length of a streaming response
    // by intercepting the stream with a counter.
    // only necessary if a content-length header is currently not set.
    var length = this.response.length;
    var body = this.body;
    var counter;
    if (null == length && body && body.readable) {
      this.body = body
        .pipe(counter = Counter())
        .on('error', this.onerror);
    }

    // log when the response is finished or closed,
    // whichever happens first.
    var ctx = this;
    var res = this.res;

    var onfinish = done.bind(null, 'finish');
    var onclose = done.bind(null, 'close');

    res.once('finish', onfinish);
    res.once('close', onclose);

    function done(event){
      res.removeListener('finish', onfinish);
      res.removeListener('close', onclose);
      co(function*() {
        yield log(ctx, start, counter ? counter.length : length, null, event, opts);
      }).catch(function(err) { });      
    }
  }
}

/**
 * Log helper.
 */

function* log(ctx, start, len, err, event, opts) {
  // get the status code of the response
  var status = err
    ? (err.status || 500)
    : (ctx.status || 404);

  // set the color of the status code;
  var s = status / 100 | 0;
  var color = colorCodes[s];

  // get the human readable response length
  var length;
  if (~[204, 205, 304].indexOf(status)) {
    length = '';
  } else if (null == len) {
    length = '-';
  } else {
    length = len;
  }

  var upstream = err ? chalk.red('xxx')
    : event === 'close' ? chalk.yellow('-x-')
    : chalk.gray('-->');

  var duration = Date.now() - start;

  if (opts.externalLogger) {
    var logObj = {
      time: start,
      originalUrl: ctx.originalUrl,
      status: status,
      duration: duration,
      length: length,
      context: ctx
    };
    yield opts.externalLogger(logObj);
  }

  if (opts.consoleEnabled) {
    console.log('  ' + upstream
      + ' ' + chalk.bold('%s')
      + ' ' + chalk.gray('%s')
      + ' ' + chalk[color]('%s')
      + ' ' + chalk.gray('%s')
      + ' ' + chalk.gray('%s'),
        ctx.method,
        ctx.originalUrl,
        status,
        time(duration),
        bytes(length));
  }
}

/**
 * Show the response time in a human readable format.
 * In milliseconds if less than 10 seconds,
 * in seconds otherwise.
 */

function time(delta) {
  delta = delta < 10000
    ? delta + 'ms'
    : Math.round(delta / 1000) + 's';
  return humanize(delta);
}
