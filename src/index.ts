import { RequestHandler } from 'express';
import { ZodError, z, ZodSchema, ZodTypeAny, ZodRawShape } from 'zod';

const types = ['query', 'params', 'body'] as const;

/**
 * A ZodSchema type guard.
 * @param schema The Zod schema to check.
 * @returns Whether the provided schema is a ZodSchema.
 */
function isZodSchema(schema: any): schema is ZodSchema {
    return schema && schema instanceof ZodSchema;
}

/**
 * Generates a middleware function for Express.js that validates request params, query, and body.
 * This function uses Zod schemas to perform validation against the provided schema definitions.
 *
 * @param schemas - An object containing Zod schemas for params, query, and body.
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
function validate<TParams extends Validation = {}, TQuery extends Validation = {}, TBody extends Validation = {}>(
    schemas: ExtendedValidationSchemas<TParams, TQuery, TBody>
): RequestHandler<ZodOutput<TParams>, any, ZodOutput<TBody>, ZodOutput<TQuery>> {
    // Create validation objects for each type
    const validation = {
        params: isZodSchema(schemas.params) ? schemas.params : z.object(schemas.params ?? {}).strict(),
        query: isZodSchema(schemas.query) ? schemas.query : z.object(schemas.query ?? {}).strict(),
        body: isZodSchema(schemas.body) ? schemas.body : z.object(schemas.body ?? {}).strict()
    };

    return (req, res, next) => {
        const errors: Array<ErrorListItem> = [];

        // Validate all types (params, query, body)
        for (const type of types) {
            const parsed = validation[type].safeParse(req[type]);
            if (parsed.success) req[type] = parsed.data;
            else errors.push({ type, errors: parsed.error });
        }

        // Return all errors if there are any
        if (errors.length > 0) return res.status(400).send(errors.map(error => ({ type: error.type, errors: error.errors })));

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
interface ErrorListItem {
    type: DataType;
    errors: ZodError<any>;
}

/**
 * Represents a generic type for route validation, which can be applied to params, query, or body.
 * Each key-value pair represents a field and its corresponding Zod validation schema.
 */
type Validation = ZodTypeAny | ZodRawShape;

/**
 * Defines the structure for the schemas provided to the validate middleware.
 * Each property corresponds to a different part of the request (params, query, body)
 * and should be a record of Zod types for validation.
 *
 * @template TParams - Type definition for params schema.
 * @template TQuery - Type definition for query schema.
 * @template TBody - Type definition for body schema.
 */
interface ExtendedValidationSchemas<TParams, TQuery, TBody> {
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
type ZodOutput<T extends Validation> = T extends ZodRawShape ? z.ZodObject<T>['_output'] : T['_output'];

export = validate;
