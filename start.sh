#!/bin/bash

# Start server and client concurrently
echo "Starting poker app..."

# Start server in background
cd "$(dirname "$0")/server" && npm run dev &
SERVER_PID=$!

# Start client in background
cd "$(dirname "$0")/client" && npm run dev &
CLIENT_PID=$!

echo "Server PID: $SERVER_PID | Client PID: $CLIENT_PID"
echo "Press Ctrl+C to stop both."

# Wait and kill both on Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID; exit" INT
wait
