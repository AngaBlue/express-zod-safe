import express from 'express';
import { z } from 'zod';
import validate from '../src/index';

const app = express();
const port = 3000;

app.get(
	'/',
	validate({
		handler: (errors, _req, res) => {
			console.error(errors);
			return res.status(400).send('Validation failed');
		},
		query: {
			name: z.string().min(3).max(10),
			age: z.coerce.number().min(18)
		}
	}),
	(req, res) => {
		const { name, age } = req.query;
		res.send(`Hello ${name}! (Your age is ${age})`);
	}
);

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
