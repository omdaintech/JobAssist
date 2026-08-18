#!/bin/bash

# Test script to verify Promtail log filtering is working correctly
# This tests the filtering without sending logs to Grafana Cloud

echo "🧪 Testing Promtail log filtering..."

# Create test log samples
cat > /tmp/test-logs.txt << 'EOF'
INFO:     127.0.0.1:52366 - "GET /api/health HTTP/1.1" 200 OK
INFO:     127.0.0.1:56454 - "GET /api/health HTTP/1.1" 200 OK
{"t":{"$date":"2025-07-27T08:34:51.147+00:00"},"s":"I","c":"NETWORK","id":6788700,"ctx":"conn39","msg":"Received first command"}
{"user_id": "687eae2f6b03e377cc7a467d", "event": "Starting exam analysis", "logger": "app.services.exam_analyzer", "level": "info", "timestamp": "2025-07-27T08:37:13.351330Z"}
level=warn ts=2025-07-27T08:34:31.999011357Z caller=client.go:419 component=client host=logs-prod-012.grafana.net msg="error sending batch, will retry"
INFO:     Uvicorn running on http://0.0.0.0:80 (Press CTRL+C to quit)
ERROR: Failed to process request
/app/app/llm/langchain_client.py:56: LangChainDeprecationWarning: The class `Ollama` was deprecated
EOF

echo "📋 Original test logs:"
cat /tmp/test-logs.txt
echo ""

# Test the filtering patterns
echo "🔍 Testing filtering patterns..."

echo "❌ Should be DROPPED (health checks):"
grep -E '.*- "GET /api/health HTTP/1\.1" 200 OK' /tmp/test-logs.txt || echo "   (none found - good!)"

echo "❌ Should be DROPPED (Database):"
grep -E '.*\{"t":\{"\$date":.*"s":"I".*"c":"(NETWORK|ACCESS|COMMAND)".*' /tmp/test-logs.txt || echo "   (none found - good!)"

echo "❌ Should be DROPPED (LangChain deprecations):"
grep -E '.*(LangChainDeprecationWarning|was deprecated in LangChain).*' /tmp/test-logs.txt || echo "   (none found - good!)"

echo "❌ Should be DROPPED (Promtail internal):"
grep -E 'level=(warn|info).*component=client.*host=.*grafana\.net.*msg="(error sending batch|will retry)"' /tmp/test-logs.txt || echo "   (none found - good!)"

echo "❌ Should be DROPPED (Uvicorn lifecycle):"
grep -E 'INFO:\s+(Uvicorn running on|Application startup complete)' /tmp/test-logs.txt || echo "   (none found - good!)"

echo ""
echo "✅ Should be KEPT (structured app logs):"
grep -E '.*"logger".*"event".*"level".*' /tmp/test-logs.txt || echo "   (none found)"

echo "✅ Should be KEPT (errors):"
grep -E '.*(ERROR|CRITICAL|FATAL|Exception|error|failed).*' /tmp/test-logs.txt || echo "   (none found)"

# Clean up
rm -f /tmp/test-logs.txt

echo ""
echo "🎯 Summary: Filtering should drop health checks, MySQL logs, deprecation warnings,"
echo "   Promtail errors, and Uvicorn lifecycle logs while keeping structured app logs and errors."
echo ""
echo "📝 To apply the filtering, run: cd monitoring && ./restart-promtail-clean.sh"
