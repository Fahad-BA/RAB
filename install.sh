#!/bin/bash

echo "🔥 Read & Burn - Installation Script"
echo "====================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 14+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Create directories
mkdir -p uploads logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if systemd available
if command -v systemctl &> /dev/null; then
    echo "🔧 Setting up systemd service..."
    
    # Enable linger
    loginctl enable-linger $(whoami)
    
    # Create systemd directory
    mkdir -p ~/.config/systemd/user
    
    # Copy service file
    cp rab-service.service ~/.config/systemd/user/rab-service.service
    
    # Reload and enable
    systemctl --user daemon-reload
    systemctl --user enable rab-service
    
    echo "✅ Service installed"
    echo "   Start: systemctl --user start rab-service"
    echo "   Status: systemctl --user status rab-service"
    echo "   Logs: journalctl --user -u rab-service -f"
else
    echo "⚠️  Systemd not found. Run manually with: npm start"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📝 Configuration:"
echo "   Port: 4002 (change with PORT env var)"
echo "   Domain: https://rab.fhidan.com (change with DOMAIN env var)"
echo "   Admin: Fahad / PASSWORD_REMOVED (change with env vars)"
echo ""
echo "🌐 Start the service:"
echo "   systemctl --user start rab-service"
echo "   or"
echo "   npm start"