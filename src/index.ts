/**
 * Module dependencies.
 */
import type { Context, Middleware, Next } from 'koa';
import type { ServerResponse } from 'http';

import Counter = require('passthrough-counter');

import humanize = require('humanize-number');

import bytes = require('bytes');

import chalk = require('chalk');

/**
 * Expose logger.
 */

export = dev;

/**
 * Color map.
 */

const colorCodes: Record<number, string> = {
  7: 'magenta',
  5: 'red',
  4: 'yellow',
  3: 'cyan',
  2: 'green',
  1: 'green',
  0: 'yellow'
};

interface LogObject {
  /** Timestamp when the request started */
  time: number;
  /** The original URL of the request */
  originalUrl: string;
  /** HTTP status code of the response */
  status: number;
  /** Request duration in milliseconds */
  duration: number;
  /** Response content length in bytes */
  length: number;
  /** The Koa context object */
  context: Context;
  /** Error object if an error occurred */
  error: Error | null;
}

interface Options {
  /** Whether to enable console logging (default: true) */
  consoleEnabled?: boolean;
  /** External logger function to call with log data */
  externalLogger?: (logObj: LogObject) => Promise<void>;
  /** Whether to truncate URL query parameters in logs (default: false) */
  truncateUrlQuery?: boolean;
}

interface NormalizedOptions {
  consoleEnabled: boolean;
  externalLogger: ((logObj: LogObject) => Promise<void>) | null;
  truncateUrlQuery: boolean;
}

interface CounterStream extends NodeJS.ReadableStream {
  length?: number;
}

interface ErrorWithStatus extends Error {
  status?: number;
}

function truncateUrlQuery (url: string): string {
  const parts = url.split('?');
  return parts[0] + (parts[1] ? `?${parts[1].slice(0, 20)}...` : '');
}

/**
 * Development logger.
 */

function dev (opts?: Options): Middleware {
  const normalizedOpts: NormalizedOptions = {
    consoleEnabled: typeof opts?.consoleEnabled === 'boolean'
      ? opts.consoleEnabled
      : true,
    externalLogger: typeof opts?.externalLogger === 'function'
      ? opts.externalLogger
      : null,
    truncateUrlQuery: typeof opts?.truncateUrlQuery === 'boolean'
      ? opts.truncateUrlQuery
      : false
  };

  return async function logger (ctx: Context, next: Next): Promise<void> {
    // request
    const start = Date.now();
    if (normalizedOpts.consoleEnabled) {
      console.log('  ' + chalk.gray('<--') +
        ' ' + chalk.bold('%s') +
        ' ' + chalk.gray('%s'),
      ctx.method,
      normalizedOpts.truncateUrlQuery ? truncateUrlQuery(ctx.originalUrl) : ctx.originalUrl
      );
    }

    try {
      await next();
    } catch (err) {
      // log uncaught downstream errors
      await log(ctx, start, null, err as ErrorWithStatus, null, normalizedOpts);
      throw err;
    }

    // calculate the length of a streaming response
    // by intercepting the stream with a counter.
    // only necessary if a content-length header is currently not set.
    const length = ctx.response.length;
    const body = ctx.body as CounterStream | undefined;
    let counter: CounterStream | undefined;
    if (length == null && body && body.readable) {
      ctx.body = body
        .pipe(counter = Counter())
        .on('error', ctx.onerror);
    }

    // log when the response is finished or closed,
    // whichever happens first.
    const res = ctx.res as ServerResponse;

    const onfinish = done.bind(null, 'finish');
    const onclose = done.bind(null, 'close');

    res.once('finish', onfinish);
    res.once('close', onclose);

    function done (event: string): void {
      res.removeListener('finish', onfinish);
      res.removeListener('close', onclose);
      log(ctx, start, counter?.length ?? length, null, event, normalizedOpts);
    }
  };
}

/**
 * Log helper.
 */

async function log (
  ctx: Context,
  start: number,
  len: number | null | undefined,
  err: ErrorWithStatus | null,
  event: string | null,
  opts: NormalizedOptions
): Promise<void> {
  // get the status code of the response
  const status = err
    ? (err.status || 500)
    : (ctx.status || 404);

  // set the color of the status code;
  const s = status / 100 | 0;
  const color = Object.prototype.hasOwnProperty.call(colorCodes, s) ? colorCodes[s] : colorCodes[0];

  // get the human readable response length
  let length: number;
  let lenStr: string;
  if (~[204, 205, 304].indexOf(status)) {
    length = 0;
    lenStr = '';
  } else if (len == null) {
    length = 0;
    lenStr = '-';
  } else {
    length = len;
    const lenBytes: string | null = bytes(len);
    lenStr = lenBytes ? lenBytes.toLowerCase() : '-';
  }

  const upstream = err
    ? chalk.red('xxx')
    : event === 'close'
      ? chalk.yellow('-x-')
      : chalk.gray('-->');

  const duration = Date.now() - start;

  if (opts.externalLogger) {
    const logObj: LogObject = {
      time: start,
      originalUrl: ctx.originalUrl,
      status,
      duration,
      length,
      context: ctx,
      error: err
    };
    await opts.externalLogger(logObj);
  }

  if (opts.consoleEnabled) {
    // Type-safe way to get chalk color function
    const colorName = color as 'magenta' | 'red' | 'yellow' | 'cyan' | 'green';
    const chalkColor = chalk[colorName];
    console.log('  ' + upstream +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalkColor('%s') +
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

function time (delta: number): string {
  return humanize(delta < 10000
    ? delta + 'ms'
    : Math.round(delta / 1000) + 's');
}
