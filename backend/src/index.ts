import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import controlRouter from './routes/control.js';
import { createArtifactUploadRouter } from './routes/artifact-upload.js';
import { requireHumanApiToken } from './security/human-auth.js';
import { resolveRuntimeDir } from './config/runtime-dir.js';

const app = express();
const runtimeDir = resolveRuntimeDir();
app.use('/api', createArtifactUploadRouter(runtimeDir));
app.use(express.json());
app.use('/api/artifacts', requireHumanApiToken, express.static(path.join(runtimeDir, 'artifacts')));
app.use('/api', controlRouter);

const jsonErrorHandler: express.ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  console.error(error);
  const message = error instanceof Error ? error.message : '処理に失敗しました';
  response.status(500).json({ error: `サーバー内部で処理に失敗しました: ${message}` });
};
app.use(jsonErrorHandler);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`zev2 backend running on port ${port}`);
});
