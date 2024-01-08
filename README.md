<h1 align="center">Express Zod Safe</h1>
<p align="center">
    <a href="https://www.npmjs.com/package/express-zod-safe" target="_blank">
  <img alt="GitHub tag (latest by date)" src="https://img.shields.io/github/v/tag/AngaBlue/express-zod-safe?label=Version">
  </a>
  <a href="https://github.com/AngaBlue/express-zod-safe/blob/master/LICENSE" target="_blank">
    <img alt="License: LGPL--3.0--or--later" src="https://img.shields.io/github/license/AngaBlue/express-zod-safe?color=green" />
  </a>
</p>

Express Zod Safe is a powerful, TypeScript-friendly middleware designed for Node.js applications, leveraging the robustness of Zod schemas to validate incoming request bodies, parameters, and queries. This package seamlessly integrates with Express.js (or similar frameworks) to provide developers with a typesafe, declarative approach to ensure data integrity and prevent invalid or malicious data from affecting their applications.

### 🏠 [Homepage](https://github.com/AngaBlue/express-zod-safe)

## 🔒 Features

 - Strongly Typed: Built with TypeScript, offering complete typesafe interfaces that enrich your development experience.
 - Zod Integration: Utilizes Zod schemas for comprehensive and customizable request validation.
 - Middleware Flexibility: Easily integrates with Express.js middleware stack, ensuring a smooth validation process without compromising performance.
 - Parameter & Query Validation: Validates not just request bodies but also URL parameters and query strings, covering all facets of incoming data.
 - Error Handling: Provides detailed, developer-friendly error responses to aid in debugging and informing API consumers.
 - Simple & Intuitive: Designed to be easy to use and understand, with a declarative API that is both concise and powerful.

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

```js
// build.js

```

## ⭐️ Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © [AngaBlue](https://github.com/AngaBlue).<br />
This project is [LGPL--3.0--or--later](https://github.com/AngaBlue/express-zod-safe/blob/master/LICENSE) licensed.
