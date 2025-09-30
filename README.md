<h1 align="center">🛡️ Express Zod Safe</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/express-zod-safe" target="_blank">
    <img alt="Downloads" src="https://img.shields.io/npm/dm/express-zod-safe.svg?color=blue&label=Downloads">
  </a>
  <a href="https://www.npmjs.com/package/express-zod-safe" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/express-zod-safe.svg?label=Version">
  </a>
  <a href="https://github.com/AngaBlue/exe/blob/master/LICENSE" target="_blank">
    <img alt="Licence: MIT" src="https://img.shields.io/npm/l/express-zod-safe?color=green&label=Licence" />
  </a>
</p>

Express Zod Safe is a strict, typesafe middleware designed for Node.js applications, leveraging the robustness of Zod schemas to validate incoming request bodies, parameters, and queries. This package seamlessly integrates with Express.js (or similar frameworks) to provide developers with a typesafe, declarative approach to ensure data integrity and prevent invalid or malicious data from affecting their applications.

_This package was inspired by Aquila169's [zod-express-middleware](https://github.com/Aquila169/zod-express-middleware) package, and is intended to be a more robust and typesafe alternative._

## 🔒 Features

 - **Typesafe**: Built with TypeScript, offering complete typesafe interfaces that enrich your development experience.
 - **Zod Integration**: Utilises Zod schemas for comprehensive and customisable request validation.
 - **Middleware Flexibility**: Easily integrates with Express.js middleware stack, ensuring a smooth validation process without compromising performance.
 - **Parameter & Query Validation**: Validates not just request bodies but also URL parameters and query strings, covering all facets of incoming data.
 - **Error Handling**: Provides detailed, developer-friendly error responses to aid in debugging and informing API consumers.
 - **Simple & Intuitive**: Designed to be easy to use and understand, with a declarative API that is both concise and powerful.

## ⬇️ Install

Install this package using your package manager of choice.

```sh
npm i express-zod-safe
```

`zod`, `express` and `@types/express` are peer dependencies and must be installed separately.  This means you can bring your own version of these packages, and this package will not force you to use a specific version.

```sh
npm i zod express && npm i -D @types/express
```

⚠️ Warning ⚠️: This package is designed to work with Zod `v4.0.0` and above.  If you are using Zod `v3.x.x`, you will need to use `express-zod-safe@1.5.4`.

## 🛠️ Usage

```ts
import express from 'express';
import validate from 'express-zod-safe';
import { z } from 'zod';
 
const app = express();
app.use(express.json());
 
// Define your Zod schemas
const params = {
  userId: z.string().uuid(),
};
const query = {
  age: z.coerce.number().optional(), // Given all query params and url params are strings, this will coerce the value to a number.
};
const body = {
  name: z.string(),
  email: z.string().email(),
};
 
// Use the validate middleware in your route
app.post('/user/:userId', validate({ params, query, body }), (req, res) => {
  // Your route logic here
  res.send('User data is valid!');
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

**Note:** The `validate` middleware must be used **after** any other middleware that parses/modifies the request body, such as `express.json()` or `express.urlencoded()`.

### 📄 Using `ValidatedRequest`
When you want to type the `Request` object outside of route handlers, you can use the `ValidatedRequest` utility to infer the validated types. Pass the same Zod schemas you provide to `validate` and the resulting `Request` type will be narrowed accordingly.

```ts
import type { Response } from 'express';
import validate, { type ValidatedRequest } from 'express-zod-safe';
import { z } from 'zod';

const bodySchema = z.object({
	title: z.string(),
	description: z.string().max(200)
});

type CreatePostRequest = ValidatedRequest<{ body: typeof bodySchema }>;

function createPostHandler(req: CreatePostRequest, res: Response) {
	// req.body.title -> string
	// req.body.description -> string (max length validated by Zod)
	res.json({ message: 'Created!' });
}

app.post('/posts', validate({ body: bodySchema }), createPostHandler);
```

### 📦 Custom Error Handling
By default, the `validate` middleware will send a 400 Bad Request response with a JSON body containing the error message.  However, you can provide your own error handling function to customise the error response.

```ts
// ... extending the previous example

const handler = (errors, req, res, next) => {
  res.status(400).json({
    message: 'Invalid request data',
    errors: errors.map((error) => error.message),
  });
};

// Use the validate middleware in your route
app.post('/user/:userId', validate({ handler, params, query, body }), (req, res) => {
  // Your route logic here
  res.send('User data is valid!');
});
```

If you plan to use the same error handler across every route, use the `setGlobalErrorHandler`:


```ts
import { setGlobalErrorHandler } from 'express-zod-safe';

setGlobalErrorHandler((errors, req, res) => {
  // Your error handling here
})
```

### ⚠️ Usage with Additional Middleware
When using `express-zod-safe` with other middleware, it is important not to explicitly type the `Request` parameter in the middleware, as this will override the inferred type that `express-zod-safe` generates from your validation schemas.  The best way to do this is to instead type your other middleware (or cast them) to `WeakRequestHandler`, a weakly typed version of the `RequestHandler` type from `express`.

```ts
import validate, { type WeakRequestHandler } from 'express-zod-safe';

// Use the RequestHandler type, instead of explicitly typing (req: Request, res: Response, next: NextFunction)
const authenticate: WeakRequestHandler = (req, res, next) => {
  // ... perform user authentication

  next();
};

app.post('/user/:userId', authenticate, validate({ params, query, body }), (req, res) => {
  // Your validation typing will work as expected here
});

```

If you do not control the middleware, such as when you import it from another library, you can instead cast the middleware to `WeakRequestHandler`.

```ts
// For one off cases...
app.post('/user/:userId', authenticate as WeakRequestHandler, validate({ params, query, body }), (req, res) => {
  // Your validation typing will work as expected here
});

// For a middleware with a lot of use, aliasing the middleware...
const auth = authenticate as WeakRequestHandler;
app.post('/user/:userId', auth, validate({ params, query, body }), (req, res) => {
  // Your validation typing will work as expected here
});
```

### ⚠️ URL Parameters & Query Strings Coercion
As mentioned in the example above, all URL parameters and query strings are parsed as strings.  This means that if you have a URL parameter or query string that is expected to be a number, you must use the `z.coerce.number()` method to coerce the value to a number.  This is because Zod will not coerce the value for you, and will instead throw an error if the value is not a string.

```ts
const params = {
  userId: z.coerce.number(),
};

app.get('/user/:userId', validate({ params }), (req, res) => {
  // req.params.userId -> number
});
```

### ⚠️ Missing Validation Schemas
If you do not provide a validation schema for a particular request component (e.g. `params`, `query`, or `body`), then that component will be assumed to be empty.  This means that requests with non-empty components will be rejected, and requests with empty components will be accepted.  The types on the `req` object will also reflect this, and will be an empty object `{}` if the component is not provided.

```ts
const body = {
  name: z.string(),
  email: z.string().email(),
};

app.post('/user', validate({ body }), (req, res) => {
  // req.body.name -> string
  // req.body.email -> string
  // req.params.age -> Property 'age' does not exist on type unknown
  // req.query.age -> Property 'age' does not exist on type unknown
});
```

This behaviour is intentional and ensures that you do not try to access or use a property that does not exist on the `req` object.  If you'd prefer to allow any property for any given request component, you can do so by setting a loose validation schema with `z.any()`.

```ts
const body = {
  name: z.string(),
  email: z.string().email(),
};

const params = z.any()

app.post('/user', validate({ body, params }), (req, res) => {
  // req.body.name -> string
  // req.body.email -> string
  // req.params.age -> any
  // req.query.age -> Property 'age' does not exist on type unknown
});
```

## ⭐️ Show your support

Give a ⭐️ on GitHub if this project helped you!

## 📝 License

Copyright © [AngaBlue](https://github.com/AngaBlue).<br />
This project is [MIT](https://github.com/AngaBlue/express-zod-safe/blob/master/LICENSE) licensed.
