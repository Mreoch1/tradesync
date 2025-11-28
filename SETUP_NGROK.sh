#!/bin/bash
# ngrok Setup Script

echo "=== ngrok Setup for Yahoo OAuth ==="
echo ""
echo "Step 1: Sign up at https://dashboard.ngrok.com/signup"
echo "Step 2: Get your authtoken at https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""
read -p "Enter your ngrok authtoken: " authtoken

if [ -z "$authtoken" ]; then
    echo "Error: Authtoken cannot be empty"
    exit 1
fi

echo "Configuring ngrok..."
ngrok config add-authtoken "$authtoken"

if [ $? -eq 0 ]; then
    echo "✓ ngrok configured successfully!"
    echo ""
    echo "Now you can run: ngrok http 3000"
else
    echo "✗ Failed to configure ngrok"
    exit 1
fi

