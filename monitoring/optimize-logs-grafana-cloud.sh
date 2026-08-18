#!/bin/bash

# Lingali - Grafana Cloud Log Monitoring Script
echo "🚀 Lingali - Grafana Cloud Monitoring"
echo "=================================================="

# Check if Promtail is running
echo "📊 Checking Promtail status..."
if ! docker-compose -f docker-compose.dev.yml ps | grep -q "promtail.*Up"; then
    echo "❌ Promtail is not running. Please start it first:"
    echo "   docker-compose -f docker-compose.dev.yml up -d promtail"
    exit 1
fi

# Display Promtail resource usage
echo ""
echo "💾 Promtail Resource Usage:"
echo "--------------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "promtail"

# Check Promtail health
echo ""
echo "🔍 Promtail Health Check:"
echo "------------------------"
PROMTAIL_LOGS=$(docker-compose -f docker-compose.dev.yml logs promtail --tail=10 2>/dev/null)

# Check for connection errors
if echo "$PROMTAIL_LOGS" | grep -q "error\|Error\|ERROR"; then
    echo "❌ Promtail errors detected:"
    echo "$PROMTAIL_LOGS" | grep -i error | tail -3
else
    echo "✅ Promtail running healthy"
fi

# Check if logs are being processed
if echo "$PROMTAIL_LOGS" | grep -q "tail routine\|watching"; then
    echo "✅ Promtail actively tailing log files"
else
    echo "⚠️  Promtail may not be processing logs"
fi

# Application log generation test
echo ""
echo "🧪 Testing Log Generation:"
echo "-------------------------"
echo "Generating test API calls..."

# Test API calls to generate logs
API_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:5001/api/health 2>/dev/null || echo "000")
API_LANGUAGES=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:5001/api/languages 2>/dev/null || echo "000")

if [ "$API_HEALTH" = "200" ]; then
    echo "✅ Health API responding (HTTP $API_HEALTH)"
else
    echo "❌ Health API not responding (HTTP $API_HEALTH)"
fi

if [ "$API_LANGUAGES" = "200" ]; then
    echo "✅ Languages API responding (HTTP $API_LANGUAGES)"
else
    echo "❌ Languages API not responding (HTTP $API_LANGUAGES)"
fi

# Configuration check
echo ""
echo "⚙️  Configuration Status:"
echo "------------------------"
CONFIG_FILE="monitoring/promtail-config.yml"

if [ -f "$CONFIG_FILE" ]; then
    echo "✅ Promtail config found: $CONFIG_FILE"

    # Check if using Grafana Cloud
    if grep -q "logs-prod.*grafana.net" "$CONFIG_FILE"; then
        echo "✅ Configured for Grafana Cloud"

        # Extract region
        REGION=$(grep "logs-prod" "$CONFIG_FILE" | sed -n 's/.*logs-prod-\([^.]*\)\.grafana\.net.*/\1/p')
        echo "📍 Region: $REGION"
    else
        echo "⚠️  Not configured for Grafana Cloud"
    fi

    # Check environment
    if grep -q "environment.*development" "$CONFIG_FILE"; then
        echo "🔧 Environment: Development"
    elif grep -q "environment.*production" "$CONFIG_FILE"; then
        echo "🔧 Environment: Production"
    fi
else
    echo "❌ Promtail config not found!"
fi

# Storage optimization
echo ""
echo "💽 Local Storage Usage:"
echo "----------------------"
DOCKER_LOGS_SIZE=$(du -sh /var/lib/docker/containers 2>/dev/null | cut -f1 || echo "Unknown")
echo "📁 Docker logs directory: $DOCKER_LOGS_SIZE"

PROMTAIL_POSITIONS=$(docker exec german-practice-webapp-promtail-1 sh -c "ls -la /tmp/positions.yaml 2>/dev/null" || echo "Positions file not found")
echo "📋 Promtail positions: $PROMTAIL_POSITIONS"

# Optimization recommendations
echo ""
echo "🔧 Optimization Recommendations:"
echo "--------------------------------"

# Check log volume by examining recent container logs
RECENT_LOGS=$(find /var/lib/docker/containers -name "*.log" -mmin -60 2>/dev/null | wc -l)
if [ "$RECENT_LOGS" -gt 20 ]; then
    echo "⚠️  High log volume detected ($RECENT_LOGS active containers)"
    echo "   Consider reviewing your drop filters in promtail-config.yml"
fi

# Check if too many containers are running
CONTAINER_COUNT=$(docker ps --format "table {{.Names}}" | wc -l)
if [ "$CONTAINER_COUNT" -gt 8 ]; then
    echo "⚠️  Many containers running ($CONTAINER_COUNT)"
    echo "   Each container generates logs - review what's necessary"
fi

echo ""
echo "🎯 Grafana Cloud Access:"
echo "-----------------------"
echo "Dashboard:    Your Grafana Cloud instance (https://yourorg.grafana.net)"
echo "Explore:      Use the Explore tab to query logs"
echo "Setup guide:  monitoring/README.md"

echo ""
echo "📝 Useful Grafana Cloud Queries:"
echo "  All logs:       {job=\"lingali-app\", environment=\"development\"}"
echo "  API requests:   {job=\"lingali-app\", method=~\"GET|POST\"}"
echo "  Errors only:    {job=\"lingali-app\", level=~\"ERROR|CRITICAL\"}"
echo "  Backend only:   {job=\"lingali-app\", service=\"fastapi-backend\"}"
echo "  Last 1 hour:    {job=\"lingali-app\"} [1h]"

echo ""
echo "🛠️  Troubleshooting Commands:"
echo "  View Promtail logs:  docker-compose -f docker-compose.dev.yml logs promtail"
echo "  Restart Promtail:    docker-compose -f docker-compose.dev.yml restart promtail"
echo "  Test API:            curl http://localhost:5001/api/health"
echo "  Edit config:         nano monitoring/promtail-config.yml"

echo ""
echo "✅ Grafana Cloud monitoring check complete!"
echo "💡 Next: Check your logs in Grafana Cloud dashboard"
