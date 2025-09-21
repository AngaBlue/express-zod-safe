/// <reference types="./express.d.ts" />
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import express from 'express';
import { type ZodError, type ZodRawShape, type ZodType, z } from 'zod';

const types = ['query', 'params', 'body'] as const;
export type Unvalidated = unknown;

/**
 * A ZodType type guard.
 * @param schema The Zod schema to check.
 * @returns Whether the provided schema is a ZodType.
 */
function isZodType(schema: unknown): schema is ZodType {
	return !!schema && typeof (schema as ZodType).safeParseAsync === 'function';
}

// Override express@^5 request.query getter to provider setter
const descriptor = Object.getOwnPropertyDescriptor(express.request, 'query');
if (descriptor) {
	Object.defineProperty(express.request, 'query', {
		get(this: Request) {
			if (Object.hasOwn(this, '_query')) return this._query;
			return descriptor?.get?.call(this);
		},
		set(this: Request, query: unknown) {
			this._query = query;
		},
		configurable: true,
		enumerable: true
	});
}

/**
 * Generates a middleware function for Express.js that validates request params, query, and body.
 * This function uses Zod schemas to perform validation against the provided schema definitions.
 *
 * @param schemas - An object containing Zod schemas for params, query, and body.  Optional handler for custom error handling.
 * @returns An Express.js middleware function that validates the request based on the provided schemas.
 *          It attaches validated data to the request object and sends error details if validation fails.
 * @template TParams - Type definition for params schema.
 * @template TQuery - Type definition for query schema.
 * @template TBody - Type definition for body schema.
 * @example
 * // Example usage in an Express.js route
 * import express from 'express';
 * import validate from 'express-zod-safe';
 * import { z } from 'zod';
 *
 * const app = express();
 *
 * // Define your Zod schemas
 * const params = {
 *   userId: z.string().uuid(),
 * };
 * const query = {
 *   age: z.coerce.number().optional(),
 * };
 * const body = {
 *   name: z.string(),
 *   email: z.string().email(),
 * };
 *
 * // Use the validate middleware in your route
 * app.post('/user/:userId', validate({ params, query, body }), (req, res) => {
 *   // Your route logic here
 *   res.send('User data is valid!');
 * });
 *
 * app.listen(3000, () => console.log('Server running on port 3000'));
 */
export default function validate<
	TParams extends ValidationSchema,
	TQuery extends ValidationSchema,
	TBody extends ValidationSchema
>(schemas: CompleteValidationSchema<TParams, TQuery, TBody>): RequestHandler<ZodOutput<TParams>, any, ZodOutput<TBody>, ZodOutput<TQuery>> {
	// Create validation objects for each type
	const validation = {
		params: isZodType(schemas.params) ? schemas.params : z.strictObject(schemas.params ?? {}),
		query: isZodType(schemas.query) ? schemas.query : z.strictObject(schemas.query ?? {}),
		body: isZodType(schemas.body) ? schemas.body : z.strictObject(schemas.body ?? {})
	};

	return async (req, res, next): Promise<void> => {
		const errors: ErrorListItem[] = [];

		// Validate all types (params, query, body)
		for (const type of types) {
			const parsed = await validation[type].safeParseAsync(req[type] ?? {});
			if (parsed.success) req[type] = parsed.data as any;
			else errors.push({ type, errors: parsed.error });
		}

		// Return all errors if there are any
		if (errors.length > 0) {
			// If a custom error handler is provided, use it
			if (schemas.handler) return schemas.handler(errors, req, res, next);

			res.status(400).send(errors.map(error => ({ type: error.type, errors: error.errors })));
			return;
		}

		return next();
	};
}

/**
 * Describes the types of data that can be validated: 'query', 'params', or 'body'.
 */
type DataType = (typeof types)[number];

/**
 * Defines the structure of an error item, containing the type of validation that failed (params, query, or body)
 * and the associated ZodError.
 */
export interface ErrorListItem {
	type: DataType;
	errors: ZodError;
}

/**
 * Represents an Express.js error request handler where the params, query and body are of unknown type as validation failed.
 */
export type ErrorRequestHandler<
	P = Unvalidated,
	ResBody = any,
	ReqBody = Unvalidated,
	ReqQuery = unknown,
	LocalsObj extends Record<string, any> = Record<string, any>
> = (
	err: ErrorListItem[],
	req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
	res: Response<ResBody, LocalsObj>,
	next: NextFunction
) => void | Promise<void>;

/**
 * Represents a generic type for route validation, which can be applied to params, query, or body.
 * Each key-value pair represents a field and its corresponding Zod validation schema.
 */
export type ValidationSchema = ZodType | ZodRawShape;

/**
 * Defines the structure for the schemas provided to the validate middleware.
 * Each property corresponds to a different part of the request (params, query, body)
 * and should be a record of Zod types for validation. Optional handler for custom error handling.
 *
 * @template TParams - Type definition for params schema.
 * @template TQuery - Type definition for query schema.
 * @template TBody - Type definition for body schema.
 */
export interface CompleteValidationSchema<
	TParams extends ValidationSchema = ValidationSchema,
	TQuery extends ValidationSchema = ValidationSchema,
	TBody extends ValidationSchema = ValidationSchema
> {
	handler?: ErrorRequestHandler;
	params?: TParams;
	query?: TQuery;
	body?: TBody;
}

/**
 * Represents the output type of a Zod validation schema.
 * This is used to infer the TypeScript type from a Zod schema,
 * providing typesafe access to the validated data.
 *
 * @template T - The validation type (params, query, or body).
 */
export type ZodOutput<T extends ValidationSchema | undefined> = T extends ValidationSchema ? z.output<T extends ZodRawShape ? z.ZodObject<T> : T> : Unvalidated;

/**
 * A utility type to ensure other middleware types don't conflict with the validate middleware.
 */
export type WeakRequestHandler = RequestHandler<Unvalidated, Unvalidated, Unvalidated, Unvalidated>;

/**
 * A utility type to ensure the request object is typed correctly.
 * @template T - The schemas to use for the request object.
 * @returns The request object with the correct types.
 * @example
 * import { TypedRequest } from 'express-zod-safe';
 * import { z } from 'zod';
 * 
 * const schemas = {
 *   params: z.object({
 *     slug: z.string().min(1)
 *   }),
 *   query: z.object({
 *     page: z.coerce.number().min(1)
 *   }),
 *   body: z.object({
 *     title: z.string().min(1)
 *   })
 * };
 * 
 * const typedHelper = (req: TypedRequest<typeof schemas>, res: Response) => {
 *   const { slug } = req.params;
 *   const { page } = req.query;
 *   const { title } = req.body;
 *   res.send(`Hello ${slug}! (Your page is ${page}) (Your title is ${title})`);
 * };
 * 
 */
export type TypedRequest<T extends CompleteValidationSchema> = Request<
	ZodOutput<T['params']>,
	any,
	ZodOutput<T['body']>,
	ZodOutput<T['query']>
>;
