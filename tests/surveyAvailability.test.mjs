import test from 'node:test';
import assert from 'node:assert/strict';
import { getSurveyAvailability } from '../src/lib/surveyAvailability.mjs';

const project = { status: 'active', start_date: '', end_date: '2026-09-17', max_responses: 10 };
const check = (changes = {}, time = '2026-09-14T17:53:16Z', count = 0) =>
  getSurveyAvailability({ ...project, ...changes }, count, new Date(time));

test('blank start date does not close a published survey before its end date', () => {
  assert.equal(check().isOpen, true);
});

test('blank and null dates impose no time limit', () => {
  for (const value of ['', null]) {
    assert.equal(check({ start_date: value, end_date: value }).isOpen, true);
  }
  assert.equal(check({ start_date: '2026-09-15', end_date: '' }, '2026-10-01T00:00:00Z').isOpen, true);
});

test('opens at midnight on the start date in Vietnam', () => {
  assert.equal(check({ start_date: '2026-09-15' }, '2026-09-14T16:59:59.999Z').reason, 'not_started');
  assert.equal(check({ start_date: '2026-09-15' }, '2026-09-14T17:00:00Z').isOpen, true);
});

test('remains open through the entire end date in Vietnam', () => {
  assert.equal(check({}, '2026-09-17T16:59:59.999Z').isOpen, true);
  assert.equal(check({}, '2026-09-17T17:00:00Z').reason, 'ended');
});

test('a survey can start and end on the same date', () => {
  assert.equal(check({ start_date: '2026-09-17' }, '2026-09-17T05:00:00Z').isOpen, true);
});

test('explicit timestamp boundaries retain their exact times', () => {
  const changes = { start_date: '2026-09-15T10:00:00+07:00', end_date: '2026-09-15T11:00:00+07:00' };
  assert.equal(check(changes, '2026-09-15T03:30:00Z').isOpen, true);
  assert.equal(check(changes, '2026-09-15T04:00:00.001Z').reason, 'ended');
});

test('inactive projects remain closed', () => {
  assert.equal(check({ status: 'completed' }).reason, 'inactive');
});

test('capacity limits remain enforced', () => {
  assert.equal(check({}, undefined, 9).capacityRemaining, 1);
  assert.equal(check({}, undefined, 10).reason, 'capacity_reached');
  assert.equal(check({}, undefined, 11).capacityRemaining, 0);
  assert.equal(check({ max_responses: 0 }, undefined, 100).isOpen, true);
});

test('malformed and reversed schedules fail closed with a specific reason', () => {
  for (const changes of [
    { start_date: 'invalid' },
    { end_date: '2026-02-30' },
    { start_date: '2026-09-18' },
  ]) {
    assert.equal(check(changes).reason, 'invalid_schedule');
  }
});
