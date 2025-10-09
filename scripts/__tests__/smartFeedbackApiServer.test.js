const { spawn } = require('child_process');
const path = require('path');

// This is a simple smoke test scaffold that will run the server and then send a POST request
// to the /api/smart-feedback endpoint. It expects the server to be running on port 4001.
// Note: It's a minimal integration-style test, not a unit test mocking the SDK.

const http = require('http');
const { URL } = require('url');

function postJson(urlString, obj) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = JSON.stringify(obj || {});
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

jest.setTimeout(30000);

describe('SMART Feedback API server', () => {
  let serverProcess;

  beforeAll((done) => {
    // Start the server as a child process
    serverProcess = spawn('node', [path.resolve(__dirname, '..', 'smartFeedbackApiServer.js')], {
      cwd: path.resolve(__dirname, '..', '..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      const line = data.toString();
      if (line.includes('SMART Feedback API server running on port')) {
        done();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      // Print errors to help debugging
      console.error('Server stderr:', data.toString());
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test('returns error when missing params', async () => {
  const resp = await postJson('http://localhost:4001/api/smart-feedback', {});
  expect(resp.status).toBe(400);
  expect(resp.data.error).toMatch(/Missing goalText/);
  });

  test('returns feedback for a simple goal (requires valid API key in env)', async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Skipping API integration test because GEMINI_API_KEY not set');
      return;
    }
    const resp = await postJson('http://localhost:4001/api/smart-feedback', {
      goalText: 'I will build a simple profile page with <img> and lists by 6 PM',
      apiKey: process.env.GEMINI_API_KEY,
      context: JSON.stringify({ phase: 'Phase 1', topic: 'Profile Page' })
    });

    expect(resp.status).toBe(200);
    expect(resp.data.feedback).toBeDefined();
  });
});
