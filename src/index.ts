/// <reference types="./express.d.ts" />
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import express from 'express';
import { type ZodError, type ZodRawShape, type ZodType, z } from 'zod';

const types = ['query', 'params', 'body'] as const;

export const defaultErrorHandler: ErrorRequestHandler = (errors, _req, res) => {
	res.status(400).send(errors.map(error => ({ type: error.type, errors: error.errors.issues })));
};

export interface ValidateRequestGlobalOptions {
	/** The error handler to use for all routes if no handler is provided in the schema. */
	handler: ErrorRequestHandler;
	/**
	 * The default schema object type to use for validation when a plain object is provided.
	 * 
	 * When using `validate({ query: { a: z.string() } })`:
	 * - `"strict"` (default): Uses `z.strictObject`, which rejects extra properties. 
	 *   For example, `GET /?a=1&b=2` will fail validation.
	 * - `"lax"`: Uses `z.object`, which allows extra properties.
	 *   For example, `GET /?a=1&b=2` will succeed, and `req.query` will only contain `{ a: "1" }`.
	 * 
	 * Note: If you pass a Zod object directly (e.g., `validate({ query: z.object({ a: z.string() }) })`),
	 * this option has no effect as the provided Zod object is used as-is.
	 * 
	 * @default "strict"
	 * @example
	 * ```ts
	 * // Allow extra properties in query params
	 * setGlobalOptions({ defaultSchemaObject: "lax" });
	 * 
	 * app.get('/user', validate({ query: { id: z.string() } }), (req, res) => {
	 *   // GET /user?id=123&extra=value will succeed
	 *   // req.query will be { id: "123" }
	 * });
	 * ```
	 */
	defaultSchemaObject: "strict" | "lax";
};

/**
 * The default global options for request validation.
 * 
 * Default values:
 * - `defaultSchemaObject: "strict"`
 */
export const DEFAULT_OPTIONS: ValidateRequestGlobalOptions = {
	/** The error handler to use for all routes if no handler is provided in the schema. */
	handler: defaultErrorHandler,
	defaultSchemaObject: "strict",
}

/**
 * The options object used by the validation middleware.
 * Initialized with {@link DEFAULT_OPTIONS} and can be modified using {@link setGlobalOptions}.
 */
const options: ValidateRequestGlobalOptions = DEFAULT_OPTIONS;

/**
 * Sets the global {@link options} for request validation.
 * 
 * @param newOptions Partial options to merge with the current global options.
 * @example
 * // Change the error handler
 * setGlobalOptions({
 *   handler: (errors, req, res) => {
 *     res.status(422).json({ validationErrors: errors });
 *   }
 * });
 * 
 * // Change default schema object type
 * setGlobalOptions({ defaultSchemaObject: "lax" });
 * 
 * // Change all options
 * setGlobalOptions({
 *   handler: customHandler,
 *   defaultSchemaObject: "lax",
 * });
 */
export const setGlobalOptions = (newOptions: Partial<ValidateRequestGlobalOptions>) => {
	Object.assign(options, newOptions);
}

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
 * app.use(express.json());
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
export default function validate<TParams extends ValidationSchema, TQuery extends ValidationSchema, TBody extends ValidationSchema>(
	schemas: CompleteValidationSchema<TParams, TQuery, TBody>
): RequestHandler<ZodOutput<TParams>, any, ZodOutput<TBody>, ZodOutput<TQuery>> {
	// Create validation objects for each type
	const zodObject = options.defaultSchemaObject === "strict" ? z.strictObject : z.object;
	const validation = {
		params: isZodType(schemas.params) ? schemas.params : zodObject(schemas.params ?? {}),
		query: isZodType(schemas.query) ? schemas.query : zodObject(schemas.query ?? {}),
		body: isZodType(schemas.body) ? schemas.body : zodObject(schemas.body ?? {})
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
			const handler = schemas.handler ?? options.handler;
			return handler(errors, req, res, next);
		}

		return next();
	};
}

/**
 * Sets the global error handler for all routes.
 * @param handler The error handler to set.
 * @deprecated Use {@link setGlobalOptions} instead.
 */
export function setGlobalErrorHandler(handler: ErrorRequestHandler): void {
	options.handler = handler;
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

export type Unvalidated = unknown;

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
export type ZodOutput<T extends ValidationSchema | undefined> = T extends ValidationSchema
	? z.output<T extends ZodRawShape ? z.ZodObject<T> : T>
	: Unvalidated;

/**
 * A utility type to ensure other middleware types don't conflict with the validate middleware.
 */
export type WeakRequestHandler = RequestHandler<Unvalidated, Unvalidated, Unvalidated, Unvalidated>;

/**
 * A utility type to ensure the Request is typed correctly.
 * @template T - The validation schema to be applied to the request params, query and body.
 * @example
 * import { ValidatedRequest } from 'express-zod-safe';
 * import { z } from 'zod';
 *
 * const schema = {
 * 	query: {
 * 		name: z.string().min(3).max(10),
 * 		age: z.coerce.number().min(18)
 * 	},
 * 	body: {
 * 		title: z.string().max(4)
 * 	},
 * 	params: {
 * 		id: z.coerce.number()
 * 	}
 * };
 *
 * const requestHandler = (req: ValidatedRequest<typeof schema>, res: Response) => {
 * 	const { name, age } = req.query;
 * 	const { id } = req.params;
 *  const { title } = req.body;
 *
 * 	res.send(`Hello ${title} ${name}! (Your age is ${age} and your ID is ${id})`);
 * };
 *
 * app.post('/handler/:id', validate(schema), requestHandler);
 */
export type ValidatedRequest<T extends CompleteValidationSchema> = Request<
	ZodOutput<T['params']>,
	any,
	ZodOutput<T['body']>,
	ZodOutput<T['query']>
>;
