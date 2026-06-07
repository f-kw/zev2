import 'dotenv/config';
import express from 'express';
import controlRouter from './routes/control.js';

const app = express();
app.use(express.json());
app.use('/api', controlRouter);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`zev2 backend running on port ${port}`);
});
