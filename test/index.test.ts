import assert from 'node:assert/strict';
import { before, beforeEach, describe, it, test } from 'node:test';

import { type IRouterMatcher, type Request, type Response } from 'express';
import { z } from 'zod';

import validate, { DEFAULT_OPTIONS, setGlobalOptions } from '../src/index.js';

// Mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRequest = (data = {}) => ({ body: {}, query: {}, params: {}, ...data }) as unknown as Request<any, any, any, any>;
const mockResponse = () => ({
    status: () => ({
        send: () => {},
    }),
} as unknown as Response);
const mockNext = () => {
    let called = false;
    const next = () => {
        called = true;
    };

    return { next, wasCalled: () => called };
};

// Tests
describe('Default options', () => {
    void it('should pass with valid data', async () => {
        const schema = z.object({ name: z.string() });
        const middleware = validate({
            body: schema,
            query: schema,
            params: schema,
        });
    
        const req = mockRequest({ body: { name: 'John Doe' }, query: { name: 'John Doe' }, params: { name: 'John Doe' } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();
    
        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), true);
    });
    
    void it('should not call next with invalid body', async () => {
        const schema = z.object({ name: z.string() });
        const middleware = validate({
            body: schema,
            query: schema,
            params: schema,
        });
    
        const req = mockRequest({ body: { name: 2 }, query: { name: 'John Doe' }, params: { name: 'John Doe' } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();
    
        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), false);
    });
    
    void it('should not call next with invalid query', async () => {
        const schema = z.object({ name: z.string() });
        const middleware = validate({
            body: schema,
            query: schema,
            params: schema,
        });
    
        const req = mockRequest({ body: { name: 'John Doe' }, query: {}, params: { name: 'John Doe' } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();
    
        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), false);
    });
    
    void it('should not call next with invalid params', async () => {
        const schema = z.object({ name: z.string() });
        const middleware = validate({
            body: schema,
            query: schema,
            params: schema,
        });
    
        const req = mockRequest({ body: { name: 'John Doe' }, query: { name: 'John Doe' }, params: { name1: 'John Doe' } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();
    
        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), false);
    });
    
    void it('should not call next when schema is not provided and data is provided', async () => {
        const schema = z.object({ name: z.string() });
        const middleware = validate({
            body: schema,
        });
    
        const req = mockRequest({ body: { name: 'John Doe' }, query: { foo: 'bar' } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();
    
        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), false);
    });
});

describe('Custom options', () => {
    void it('should pass when schema is not provided and data is provided with { missingSchemaBehavior: "any" }', async () => {
        setGlobalOptions({
            ...DEFAULT_OPTIONS,
            missingSchemaBehavior: "any"
        });

        const schema = z.object({ name: z.string() });
        const middleware = validate({
            body: schema,
        });

        const req = mockRequest({ body: { name: 'John Doe' }, query: { foo: 'bar' } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();

        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), true);
    });

    void it('should pass with valid data and extra properties with { defaultSchemaObject: "lax" }', async () => {
        setGlobalOptions({
            ...DEFAULT_OPTIONS,
            defaultSchemaObject: "lax"
        });

        const schema = z.object({ name: z.string() });
        const middleware = validate({
            body: schema,
        });

        const req = mockRequest({ body: { name: 'John Doe', foo: 'bar' } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();

        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), true);
        assert.deepStrictEqual(req.body, { name: 'John Doe' });
    });

    void it('should call custom handler when validation fails with { handler: customHandler }', async () => {
        let didFail = false;
        setGlobalOptions({
            ...DEFAULT_OPTIONS,
            handler: () => {
                didFail = true;
            }
        });

        const schema = z.object({ name: z.string() });
        const middleware = validate({ body: schema });

        const req = mockRequest({ body: { name: 2 } });
        const res = mockResponse();
        const { next, wasCalled } = mockNext();

        await middleware(req, res, next);
        assert.strictEqual(wasCalled(), false);
        assert.strictEqual(didFail, true);
    });
});

// TypeScript compile time checks
// This block will not run, but will fail the test if the types are incorrect
if (process.env.TYPE_CHECKS_BLOCK) {
    const routerMatcher = null as unknown as IRouterMatcher<'get'>;

    const schema = z.object({ name: z.string() });

    routerMatcher('/', validate({ body: schema }), (req, res, next) => {
        // @ts-expect-error This field is not in the schema and should not exist
        console.log(req.body.notExists);
        // This field is in the schema and should exist
        console.log(req.body.name);

        // @ts-expect-error Query should be empty
        console.log(req.query.foo);

        // @ts-expect-error Params should be empty
        console.log(req.params.foo);
    });
}
