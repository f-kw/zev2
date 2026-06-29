import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import controlRouter from './routes/control.js';
import { createArtifactUploadRouter } from './routes/artifact-upload.js';

const app = express();
const runtimeDir = process.env.ZEV2_RUNTIME_DIR
  ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
  : path.resolve(process.cwd(), '../runtime');
app.use('/api', createArtifactUploadRouter(runtimeDir));
app.use(express.json());
app.use('/api/artifacts', express.static(path.join(runtimeDir, 'artifacts')));
app.use('/api', controlRouter);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`zev2 backend running on port ${port}`);
});
