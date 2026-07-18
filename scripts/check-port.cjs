const net = require('net')

const port = Number(process.argv[2] || 3001)
const probe = net.createServer()

probe.once('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing HideGames server or choose a free port before starting the desktop app.`)
    process.exitCode = 1
    return
  }
  console.error(`Could not verify port ${port}: ${error.message}`)
  process.exitCode = 1
})

probe.once('listening', () => probe.close())
probe.listen(port)
