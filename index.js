/**
 * Module dependencies.
 */
'use strict';

const Counter = require('passthrough-counter');
const humanize = require('humanize-number');
const bytes = require('bytes');
const chalk = require('chalk');

/**
 * Expose logger.
 */

module.exports = dev;

/**
 * Color map.
 */

const colorCodes = {
  7: 'magenta',
  5: 'red',
  4: 'yellow',
  3: 'cyan',
  2: 'green',
  1: 'green',
  0: 'yellow'
};

function truncateUrlQuery (url) {
  const parts = url.split('?');
  return parts[0] + (parts[1] ? `?${parts[1].slice(0, 20)}...` : '');
}

/**
 * Development logger.
 */

function dev (opts) {
  opts = opts || {};
  opts.consoleEnabled = typeof opts.consoleEnabled === 'boolean'
    ? opts.consoleEnabled : true;
  opts.externalLogger = typeof opts.externalLogger === 'function'
    ? opts.externalLogger : null;
  opts.truncateUrlQuery = typeof opts.truncateUrlQuery === 'boolean'
    ? opts.truncateUrlQuery : false;

  return async function logger (ctx, next) {
    // request
    const start = Date.now();
    if (opts.consoleEnabled) {
      console.log('  ' + chalk.gray('<--') +
        ' ' + chalk.bold('%s') +
        ' ' + chalk.gray('%s'),
        ctx.method,
        opts.truncateUrlQuery ? truncateUrlQuery(ctx.originalUrl) : ctx.originalUrl
      );
    }

    try {
      await next();
    } catch (err) {
      // log uncaught downstream errors
      await log(ctx, start, null, err, null, opts);
      throw err;
    }

    // calculate the length of a streaming response
    // by intercepting the stream with a counter.
    // only necessary if a content-length header is currently not set.
    const length = ctx.response.length;
    const body = ctx.body;
    let counter;
    if (length == null && body && body.readable) {
      ctx.body = body
        .pipe(counter = Counter())
        .on('error', ctx.onerror);
    }

    // log when the response is finished or closed,
    // whichever happens first.
    const res = ctx.res;

    const onfinish = done.bind(null, 'finish');
    const onclose = done.bind(null, 'close');

    res.once('finish', onfinish);
    res.once('close', onclose);

    function done (event) {
      res.removeListener('finish', onfinish);
      res.removeListener('close', onclose);
      log(ctx, start, counter ? counter.length : length, null, event, opts);
    }
  };
}

/**
 * Log helper.
 */

async function log (ctx, start, len, err, event, opts) {
  // get the status code of the response
  const status = err
    ? (err.status || 500)
    : (ctx.status || 404);

  // set the color of the status code;
  const s = status / 100 | 0;
  const color = colorCodes.hasOwnProperty(s) ? colorCodes[s] : 0;

  // get the human readable response length
  // let length
  // if (~[204, 205, 304].indexOf(status)) {
  //   length = ''
  // } else if (len == null) {
  //   length = '-'
  // } else {
  //   length = len
  // }
  let length, lenStr;
  if (~[204, 205, 304].indexOf(status)) {
    length = 0;
    lenStr = '';
  } else if (len == null) {
    length = 0;
    lenStr = '-';
  } else {
    length = len;
    lenStr = bytes(len).toLowerCase();
  }

  const upstream = err ? chalk.red('xxx')
    : event === 'close' ? chalk.yellow('-x-')
    : chalk.gray('-->');

  const duration = Date.now() - start;

  if (opts.externalLogger) {
    var logObj = {
      time: start,
      originalUrl: ctx.originalUrl,
      status: status,
      duration: duration,
      length: length,
      context: ctx,
      error: err
    };
    await opts.externalLogger(logObj);
  }

  if (opts.consoleEnabled) {
    console.log('  ' + upstream +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk[color]('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.gray('%s'),
      ctx.method,
      opts.truncateUrlQuery ? truncateUrlQuery(ctx.originalUrl) : ctx.originalUrl,
      status,
      time(duration),
      lenStr
    );
  }
}

/**
 * Show the response time in a human readable format.
 * In milliseconds if less than 10 seconds,
 * in seconds otherwise.
 */

function time (delta) {
  return humanize(delta < 10000
    ? delta + 'ms'
    : Math.round(delta / 1000) + 's');
}
