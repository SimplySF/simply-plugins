#!/usr/bin/env node

const { main } = await import('../lib/server.js');
const exitCode = await main(process.argv.slice(2));
if (exitCode !== undefined) process.exitCode = exitCode;
