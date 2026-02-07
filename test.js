'use strict';
/**
 * test cases
 */

// test tools
const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

// test subjects
const chalk = require('chalk');
const app = require('./test-server');
let log;
let server;

describe('koa-logger', () => {
  beforeEach(() => {
    log = mock.method(console, 'log');
    server = app.listen();
  });

  afterEach(() => {
    log.mock.restore();
    if (server) {
      server.close();
    }
  });

  it('should log a request', async () => {
    await request(server).get('/200').expect(200, 'hello world');
    assert.ok(log.mock.callCount() > 0, 'console.log should have been called');
  });

  it('should log a request with correct method and url', async () => {
    await request(server).head('/200').expect(200);
    const calls = log.mock.calls;
    const requestLog = calls[0].arguments;
    assert.strictEqual(requestLog[0], '  ' + chalk.gray('<--') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s'));
    assert.strictEqual(requestLog[1], 'HEAD');
    assert.strictEqual(requestLog[2], '/200');
  });

  it('should log a response', async () => {
    await request(server).get('/200').expect(200);
    assert.strictEqual(log.mock.callCount(), 2, 'should log request and response');
  });

  it('should log a 200 response', async () => {
    await request(server).get('/200').expect(200);
    assert.strictEqual(log.mock.callCount(), 2);
    const responseLog = log.mock.calls[1].arguments;
    assert.strictEqual(responseLog[0], '  ' + chalk.gray('-->') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.green('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.gray('%s'));
    assert.strictEqual(responseLog[1], 'GET');
    assert.strictEqual(responseLog[2], '/200');
    assert.strictEqual(responseLog[3], 200);
    // responseLog[4] is the time duration - skip checking it
    assert.strictEqual(responseLog[5], '11b');
  });

  it('should log a 301 response', async () => {
    await request(server).get('/301').expect(301);
    assert.strictEqual(log.mock.callCount(), 2);
    const responseLog = log.mock.calls[1].arguments;
    assert.strictEqual(responseLog[0], '  ' + chalk.gray('-->') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.cyan('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.gray('%s'));
    assert.strictEqual(responseLog[1], 'GET');
    assert.strictEqual(responseLog[2], '/301');
    assert.strictEqual(responseLog[3], 301);
    // responseLog[4] is the time duration - skip checking it
    assert.strictEqual(responseLog[5], '-');
  });

  it('should log a 304 response', async () => {
    await request(server).get('/304').expect(304);
    assert.strictEqual(log.mock.callCount(), 2);
    const responseLog = log.mock.calls[1].arguments;
    assert.strictEqual(responseLog[0], '  ' + chalk.gray('-->') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.cyan('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.gray('%s'));
    assert.strictEqual(responseLog[1], 'GET');
    assert.strictEqual(responseLog[2], '/304');
    assert.strictEqual(responseLog[3], 304);
    // responseLog[4] is the time duration - skip checking it
    assert.strictEqual(responseLog[5], '');
  });

  it('should log a 404 response', async () => {
    await request(server).get('/404').expect(404);
    assert.strictEqual(log.mock.callCount(), 2);
    const responseLog = log.mock.calls[1].arguments;
    assert.strictEqual(responseLog[0], '  ' + chalk.gray('-->') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.yellow('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.gray('%s'));
    assert.strictEqual(responseLog[1], 'GET');
    assert.strictEqual(responseLog[2], '/404');
    assert.strictEqual(responseLog[3], 404);
    // responseLog[4] is the time duration - skip checking it
    assert.strictEqual(responseLog[5], '9b');
  });

  it('should log a 500 response', async () => {
    await request(server).get('/500').expect(500);
    assert.strictEqual(log.mock.callCount(), 2);
    const responseLog = log.mock.calls[1].arguments;
    assert.strictEqual(responseLog[0], '  ' + chalk.gray('-->') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.red('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.gray('%s'));
    assert.strictEqual(responseLog[1], 'GET');
    assert.strictEqual(responseLog[2], '/500');
    assert.strictEqual(responseLog[3], 500);
    // responseLog[4] is the time duration - skip checking it
    assert.strictEqual(responseLog[5], '12b');
  });

  it('should log middleware error', async () => {
    await request(server).get('/error').expect(500);
    assert.strictEqual(log.mock.callCount(), 2);
    const responseLog = log.mock.calls[1].arguments;
    assert.strictEqual(responseLog[0], '  ' + chalk.red('xxx') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.red('%s') +
      ' ' + chalk.gray('%s') +
      ' ' + chalk.gray('%s'));
    assert.strictEqual(responseLog[1], 'GET');
    assert.strictEqual(responseLog[2], '/error');
    assert.strictEqual(responseLog[3], 500);
    // responseLog[4] is the time duration - skip checking it
    assert.strictEqual(responseLog[5], '-');
  });
});
