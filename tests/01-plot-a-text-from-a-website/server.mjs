import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);
const PORT = 3000;

// ---------------------------------------------------------
// CONFIGURATION: Set the paths to your binaries here.
const VPYPE_PATH = '/Users/janaelst/.local/bin/vpype'; 
const AXICLI_PATH = '/Users/janaelst/.pyenv/shims/axicli';
// ---------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/api/plot' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { svg } = JSON.parse(body);
        if (!svg) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing SVG data' }));
          return;
        }

        const inputPath = path.join(process.cwd(), 'temp_input.svg');
        const outputPath = path.join(process.cwd(), 'temp_optimized.svg');

        // Save SVG to temp file
        fs.writeFileSync(inputPath, svg);

        // 1. Run vpype to optimize the SVG
        const vpypeCmd = `${VPYPE_PATH} read "${inputPath}" linemerge linesort write "${outputPath}"`;
        console.log(`Executing: ${vpypeCmd}`);

        try {
          await execPromise(vpypeCmd);
          console.log(`SVG optimized at ${outputPath}`);

          // 2. Run axicli to plot the optimized SVG
          const axicliCmd = `${AXICLI_PATH} "${outputPath}"`;
          console.log(`Executing: ${axicliCmd}`);

          const { stdout, stderr } = await execPromise(axicliCmd);
          console.log(`axicli output: ${stdout}`);
          if (stderr) console.error(`axicli stderr: ${stderr}`);

          // Cleanup
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'SVG optimized and plotted via axicli',
          }));
        } catch (error) {
          console.error(`Error: ${error.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Plotting failed', details: error.message }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(` Plotter Server running at http://localhost:${PORT}`);
  console.log(` Endpoint: POST /api/plot`);
});
