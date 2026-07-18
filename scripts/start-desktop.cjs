const net = require('net')
const path = require('path')
const { spawn } = require('child_process')

const isAvailable = port => new Promise(resolve => {
  const probe = net.createServer()
  probe.once('error', () => resolve(false))
  probe.once('listening', () => probe.close(() => resolve(true)))
  probe.listen(port)
})

async function findPort() {
  for (let port = 3001; port < 3021; port++) if (await isAvailable(port)) return port
  throw new Error('3001〜3020番ポートに空きがありません')
}

async function main() {
  const port = await findPort()
  const serverUrl = `http://127.0.0.1:${port}`
  if (port !== 3001) console.log(`Port 3001 is in use. Starting HideGames on ${port} instead.`)
  const bin = process.platform === 'win32' ? 'concurrently.cmd' : 'concurrently'
  const command = path.join(__dirname, '..', 'node_modules', '.bin', bin)
  const child = spawn(command, [
    '-k',
    'npm run server',
    'vite --host 127.0.0.1 --port 5173',
    `wait-on tcp:${port} http://127.0.0.1:5173 && electron .`,
  ], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), VITE_SOCKET_URL: serverUrl, HIDEGAMES_DEV_URL: 'http://127.0.0.1:5173' },
    stdio: 'inherit',
  })
  child.on('exit', code => process.exitCode = code ?? 1)
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
