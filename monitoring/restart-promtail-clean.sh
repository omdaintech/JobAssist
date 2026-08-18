#!/bin/bash

# Script to restart Promtail with the clean log filtering configuration
# This will dramatically reduce log volume sent to Grafana Cloud

echo "🧹 Restarting Promtail with clean log filtering..."

# Stop existing Promtail if running
echo "Stopping existing Promtail containers..."
docker stop promtail 2>/dev/null || true
docker rm promtail 2>/dev/null || true

# Wait a moment
sleep 2

# Start Promtail with the new clean configuration
echo "Starting Promtail with clean configuration..."
docker run -d \
  --name promtail \
  --restart unless-stopped \
  -v $(pwd)/promtail-config-app-logs.yml:/etc/promtail/config.yml \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 9080:9080 \
  grafana/promtail:latest \
  -config.file=/etc/promtail/config.yml

# Check status
sleep 3
if docker ps | grep -q promtail; then
  echo "✅ Promtail started successfully with clean configuration"
  echo "📊 Log filtering now active:"
  echo "   ❌ Database connection logs - DROPPED"
  echo "   ❌ Uvicorn HTTP requests - DROPPED"
  echo "   ❌ LangChain deprecations - DROPPED"
  echo "   ❌ Promtail internal logs - DROPPED"
  echo "   ❌ Development server logs - DROPPED"
  echo "   ✅ Application logs with 'logger' field - KEPT"
  echo "   ✅ Error/Exception logs - KEPT"
  echo "   ✅ Important startup/shutdown logs - KEPT"
  echo ""
  echo "📈 Expected result: 90%+ reduction in log volume to Grafana Cloud"
  echo ""
  echo "🔍 Monitor Grafana Cloud to confirm log volume reduction"
  echo "   Only structured application logs should now appear"
else
  echo "❌ Failed to start Promtail"
  echo "Check docker logs with: docker logs promtail"
fi
