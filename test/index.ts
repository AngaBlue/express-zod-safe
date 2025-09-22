import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import validate, { type CompleteValidationSchema, type ValidatedRequest, type WeakRequestHandler } from '../src/index';

const app = express();
const port = 3000;

app.use(express.json());

const authenticate = (_req: Request, _res: Response, next: NextFunction) => {
	next();
};

const schema = {
	query: {
		name: z.string().min(3).max(10),
		age: z.coerce.number().min(18)
	},
	body: {
		title: z.string().max(4)
	},
	params: {
		id: z.coerce.number()
	}
} satisfies CompleteValidationSchema;

app.post(
	'/:id',
	authenticate as WeakRequestHandler,
	validate({
		handler: (errors, _req, res) => {
			console.error(errors);
			res.status(400).send('Validation failed');
			return;
		},
		...schema
	}),
	(req, res) => {
		const { name, age } = req.query;
		const { id } = req.params;
		// @ts-expect-error
		const { title, notFound } = req.body;

		res.send(`Hello ${title} ${name}! (Your age is ${age} and your ID is ${id})`);
	}
);

const requestHandler = (req: ValidatedRequest<typeof schema>, res: Response) => {
	const { name, age } = req.query;
	const { id } = req.params;
	const { title } = req.body;

	res.send(`Hello ${title} ${name}! (Your age is ${age} and your ID is ${id})`);
};

app.post('/handler/:id', validate(schema), requestHandler);

app.listen(port, () => console.log(`Server is running on port ${port}`));
