import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

import validate, { type TypedRequest, type WeakRequestHandler } from '../src/index';

const app = express();
const port = 3000;

const authenticate = (_req: Request, _res: Response, next: NextFunction) => {
	next();
};

const query = {
	name: z.string().min(3).max(10),
	age: z.coerce.number().min(18)
};

const body = {
	title: z.string().max(4)
};

const params = {
	id: z.coerce.number()
};

app.get(
	'/:id',
	authenticate as WeakRequestHandler,
	validate({
		handler: (errors, _req, res) => {
			console.error(errors);
			res.status(400).send('Validation failed');
			return;
		},
		body,
		query,
		params
	}),
	(req, res) => {
		const { name, age } = req.query;
		res.send(`Hello ${name}! (Your age is ${age})`);
	}
);


const typedSchema = {
	params: z.object({
		slug: z.string().min(1)
	}),
	query: z.object({
		page: z.coerce.number().min(1)
	}),
	body: z.object({
		title: z.string().min(1)
	})
};

const typedHelper = (req: TypedRequest<typeof typedSchema>, res: Response) => {

	const { slug } = req.params;
	const { page } = req.query;
	const { title } = req.body;

	res.send(`Hello ${slug}! (Your page is ${page}) (Your title is ${title})`);
};

app.get('/typed/:slug', validate(typedSchema), typedHelper);

app.listen(port, () => console.log(`Server is running on port ${port}`));
