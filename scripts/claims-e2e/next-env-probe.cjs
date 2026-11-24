// Runs in a FRESH process whose environment is exactly the one to evaluate.
// Prints what Next.js (`next dev`) would load for <dir>: the combined env and
// every value of every .env file it read (including ones masked by inherited
// variables). Never logs anything else.
const [dir, nextEnvPath] = process.argv.slice(2)
const { loadEnvConfig } = require(nextEnvPath)
const silent = { info() {}, error() {}, warn() {}, log() {} }
const { combinedEnv, loadedEnvFiles } = loadEnvConfig(dir, true, silent, true)
const env = { ...combinedEnv }
delete env.__NEXT_PROCESSED_ENV
process.stdout.write('\n__CLAIMS_E2E_PROBE__' + JSON.stringify({
  env,
  files: loadedEnvFiles.map(f => ({ path: f.path, values: f.env })),
}))
