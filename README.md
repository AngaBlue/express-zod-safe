<h1 align="center">🛡️ Express Zod Safe</h1>
<p align="center">
    <a href="https://www.npmjs.com/package/express-zod-safe" target="_blank">
  <img alt="GitHub tag (latest by date)" src="https://img.shields.io/github/v/tag/AngaBlue/express-zod-safe?label=Version">
  </a>
  <a href="https://github.com/AngaBlue/express-zod-safe/blob/master/LICENSE" target="_blank">
    <img alt="License: LGPL--3.0--or--later" src="https://img.shields.io/github/license/AngaBlue/express-zod-safe?color=green" />
  </a>
</p>

Express Zod Safe is a powerful, typesafe middleware designed for Node.js applications, leveraging the robustness of Zod schemas to validate incoming request bodies, parameters, and queries. This package seamlessly integrates with Express.js (or similar frameworks) to provide developers with a typesafe, declarative approach to ensure data integrity and prevent invalid or malicious data from affecting their applications.

### 🏠 [Homepage](https://github.com/AngaBlue/express-zod-safe)

## 🔒 Features

 - **Typesafe**: Built with TypeScript, offering complete typesafe interfaces that enrich your development experience.
 - **Zod Integration**: Utilizes Zod schemas for comprehensive and customizable request validation.
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

## Usage

```ts
import express from 'express';
import validate from 'express-zod-safe';
import { z } from 'zod';
 
const app = express();
 
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
app.get('/user/:userId', validate({ params, query, body }), (req, res) => {
  // Your route logic here
  res.send('User data is valid!');
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

__Note:__ The `validate` middleware must be used __after__ any other middleware that parses/modifies the request body, such as `express.json()` or `express.urlencoded()`.

### URL Parameters & Query Strings Coercion
As mentioned in the example above, all URL parameters and query strings are parsed as strings.  This means that if you have a URL parameter or query string that is expected to be a number, you must use the `z.coerce.number()` method to coerce the value to a number.  This is because Zod will not coerce the value for you, and will instead throw an error if the value is not a string.

### Missing Validation Schemas
If you do not provide a validation schema for a particular request component (e.g. `params`, `query`, or `body`), then that component will be assumed to be empty.  This means that requests with non-empty components will be rejected, and requests with empty components will be accepted.  The types on the `req` object will also reflect this, and will be `undefined` if the component is not provided.

## ⭐️ Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © [AngaBlue](https://github.com/AngaBlue).<br />
This project is [LGPL--3.0--or--later](https://github.com/AngaBlue/express-zod-safe/blob/master/LICENSE) licensed.
