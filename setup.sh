#!/bin/bash

# CTO SLA Dashboard Setup Script
# Developed by Homains for SWAP

set -e

echo "🔧 CTO SLA Dashboard Setup"
echo "=========================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Setup cancelled"
        exit 0
    fi
fi

# Create .env file
echo "📝 Creating .env file..."
cat > .env <<EOF
# API Configuration
PORT=3001
NODE_ENV=production

# AWS Configuration (use AWS profile 'swap')
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/sla-monitoring

# Application URLs
CLIENT_URL=https://a-cto.swapegypt.app
API_URL=https://a-cto.swapegypt.app/api
EOF

echo "✅ .env file created"
echo ""

echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your AWS credentials"
echo "2. Start MongoDB: docker-compose up mongo -d"
echo "3. Run development server: npm run dev (frontend) & npm run api (backend)"
echo "4. Or deploy to production: ./deploy.sh"
echo ""
echo "📊 Dashboard will be available at:"
echo "   Local: http://localhost:3000"
echo "   Production: https://a-cto.swapegypt.app"
echo ""
echo "Developed by Homains (https://homains.eu) for SWAP"
