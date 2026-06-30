#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
  osascript -e 'display alert "Node.js not installed" message "Download and install Node.js from nodejs.org, then double-click Start PresaleDrop again."'
  exit 1
fi

node server.js
