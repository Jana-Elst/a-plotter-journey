// Import core Node.js modules needed for the application
import http from 'node:http'; // Provides tools to construct a web server
import fs from 'node:fs'; // File System - allows us to create, read, and delete files on the hard drive
import path from 'node:path'; // Helps us safely build file paths across different operating systems
import { exec } from 'node:child_process'; // Allows us to execute terminal commands from within Javascript
import { promisify } from 'node:util'; // Tool to convert older, callback-based functions into modern Promises

// Convert the older `exec` function to return a Promise, allowing us to use modern `await` syntax 
// to pause the code until a terminal command officially finishes executing.
const execPromise = promisify(exec);

// Load essential configuration values from the environment variables (e.g., from the .env file)
const PORT = process.env.PORT;
const VPYPE_PATH = process.env.VPYPE_PATH; 
const AXICLI_PATH = process.env.AXICLI_PATH; 

// --- HELPERS ---
// Helper function: Reads the raw incoming data stream from the browser request and converts it into a usable Javascript Object (JSON).
const readJsonBody = async (request) => {
  let body = '';
  // Since HTTP requests can be sent in small piece-by-piece "chunks" over the network, 
  // we loop through and combine all the chunks into one big string.
  for await (const chunk of request) body += chunk;
  // Parse the final string assuming it's JSON data
  return JSON.parse(body);
};


// Helper function: Simplifies the repetitive task of sending a JSON response back to the browser.
// It automatically sets the correct headers and stringifies the data.
const sendJson = (response, status, data) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(data));
};


// --- SERVER ---
// Create the actual HTTP server. Every time someone hits http://localhost:PORT, this function runs.
const server = http.createServer(async (request, response) => {
  
  // Set Cross-Origin Resource Sharing (CORS) headers.
  // This tells the browser that it's safe for a webpage on a different URL to talk to this server.
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // If the browser sends an 'OPTIONS' request (a pre-flight safety check used by CORS), 
  // we reply with '204 No Content' to tell it everything is safe to proceed.
  if (request.method === 'OPTIONS') return response.writeHead(204).end();

  // We wrap all of our logic in a try/catch block so that if anything crashes (like an invalid JSON payload,
  // or a disconnected plotter machine), the server returns a friendly 500 Error instead of crashing the Node process.
  try {
    // ============================================
    // 1. PEN ACTION ENDPOINT
    // Endpoint used for manually raising or lowering the plotter pen to calibrate it.
    // ============================================
    if (request.url === '/api/pen-action' && request.method === 'POST') {
      const { action, penUp, penDown } = await readJsonBody(request);
      
      // Construct the terminal command based on whether we are raising or lowering the pen.
      // Notice we target `/dev/null` because manual hardware actions do not require an actual SVG file.
      const axicliCmd = action === 'up' 
        ? `${AXICLI_PATH} /dev/null -m manual -M raise_pen -u ${penUp}` 
        : `${AXICLI_PATH} /dev/null -m manual -M lower_pen -d ${penDown}`;

      console.log(`Executing: ${axicliCmd}`);
      
      // Execute the command in the background terminal and wait for it to finish
      await execPromise(axicliCmd);
      return sendJson(response, 200, { success: true });
    }

    // ============================================
    // 2. PLOT ENDPOINT
    // Main endpoint that receives SVG data, optimizes it, and physically draws it.
    // ============================================
    if (request.url === '/api/plot' && request.method === 'POST') {
      const { svg, penUp, penDown } = await readJsonBody(request);
      
      // Validation to ensure the website actually sent us SVG text content
      if (!svg) return sendJson(response, 400, { error: 'Missing SVG data' });

      // Define secure paths in the current project directory to temporarily save files
      const inputPath = path.join(process.cwd(), 'temp_input.svg');
      const outputPath = path.join(process.cwd(), 'temp_optimized.svg');
      
      // Physically write the raw SVG text string onto the computer's hard drive
      fs.writeFileSync(inputPath, svg);

      // STEP A: Optimize the SVG using 'vpype'
      // This applies 'linemerge' and 'linesort' to significantly reduce the time the pen spends jumping around in the air.
      const vpypeCmd = `${VPYPE_PATH} read "${inputPath}" linemerge linesort write "${outputPath}"`;
      console.log(`Executing: ${vpypeCmd}`);
      await execPromise(vpypeCmd);

      // STEP B: Send the optimized SVG to the AxiDraw tool
      // Forcing it to apply the provided pen heights dynamically
      const axicliCmd = `${AXICLI_PATH} "${outputPath}" -u ${penUp} -d ${penDown}`;
      console.log(`Executing: ${axicliCmd}`);
      const { stdout, stderr } = await execPromise(axicliCmd);
      
      // If there are command-line warnings, output them to the hidden node console
      if (stderr) console.error(`Stderr: ${stderr}`);

      // STEP C: Clean up the temporary files from the hard drive since plotting is complete
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);

      // Tell the website everything was successful!
      return sendJson(response, 200, { success: true, message: 'Plotted!' });
    }

    // ============================================
    // 3. 404 NOT FOUND 
    // If the browser requests an unknown URL, tell it no content exists here.
    // ============================================
    response.writeHead(404).end();

  } catch (error) {
    // If execution hits this block, something broke above (bad command, invalid json, disconnected machine, etc).
    console.error('Server error:', error.message);
    sendJson(response, 500, { error: 'Operation failed', details: error.message });
  }
});

// Actually boot up the server and have it actively listen via the network on the specified PORT.
server.listen(PORT, () => {
  console.log(`Plotter Server running at http://localhost:${PORT}`);
});
