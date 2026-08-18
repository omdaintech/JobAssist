#!/bin/bash

# Test script to verify Grafana Cloud log ingestion
# This generates different log levels that should appear in Grafana

SERVER_IP="${1:-72.61.182.225}"
SERVER_USER="${2:-root}"

echo "🧪 Testing Grafana Cloud Log Ingestion"
echo "======================================="
echo ""

# Generate test logs
echo "📝 Generating test logs on server..."
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
    docker exec german-practice-webapp-backend-1 python << 'PYTHON'
import structlog
import time

logger = structlog.get_logger()

# Generate different log levels
logger.info("GRAFANA_TEST_INFO", test_type="info", timestamp=time.time())
logger.warning("GRAFANA_TEST_WARNING", test_type="warning", timestamp=time.time())
logger.error("GRAFANA_TEST_ERROR", test_type="error", timestamp=time.time())

print("\n✅ Test logs generated successfully!")
print("📊 Check Grafana Cloud for these logs:")
print("   - GRAFANA_TEST_INFO (should be filtered out)")
print("   - GRAFANA_TEST_WARNING (should appear)")
print("   - GRAFANA_TEST_ERROR (should appear)")
PYTHON
EOF

echo ""
echo "⏳ Waiting 15 seconds for logs to reach Grafana Cloud..."
sleep 15

echo ""
echo "✅ Done! Check your Grafana dashboard for:"
echo "   🔍 Search for: GRAFANA_TEST"
echo "   📅 Time range: Last 15 minutes"
echo "   🔗 Filter: environment=production"
echo ""
echo "Expected Results:"
echo "  ✅ GRAFANA_TEST_WARNING should appear"
echo "  ✅ GRAFANA_TEST_ERROR should appear"
echo "  ❌ GRAFANA_TEST_INFO should NOT appear (filtered)"
echo "  ❌ Health check logs should NOT appear (filtered)"
