# Automated API Testing System

This directory contains automated tests for all API domains to ensure nothing breaks when you make changes.

## 🚀 Quick Start

```bash
# Run all domain tests (recommended before any deployment)
python3 scripts/run_all_tests.py

# Run individual domain tests
python3 scripts/school_api_test.py    # School APIs (critical)
python3 scripts/admin_api_test.py     # Admin APIs (critical)
python3 scripts/user_api_test.py      # User APIs (non-critical)
```

## 📊 What Gets Tested

### School APIs (Critical)
- Authentication and session management
- Template creation and validation rules
- Session creation with proper validation
- User management within schools
- Billing and dashboard endpoints

### Admin APIs (Critical)
- System admin authentication
- School management
- System health checks
- Question management

### User APIs (Non-Critical)
- User authentication
- Profile management
- Language endpoints
- Dashboard access

## 📁 Reports Generated

Tests automatically generate reports in domain-specific directories:

```
docs/
├── school/
│   └── API_TEST_REPORT_YYYY-MM-DD.md
├── admin/
│   └── API_TEST_REPORT_YYYY-MM-DD.md
├── user/
│   └── API_TEST_REPORT_YYYY-MM-DD.md
└── API_MASTER_TEST_REPORT_YYYY-MM-DD.md
```

## 🎯 Exit Codes

- **0**: All critical systems operational (safe to deploy)
- **1**: Critical failures detected (do not deploy)

## 🔧 Configuration

Update credentials in each test file:
- `school_api_test.py`: School admin credentials
- `admin_api_test.py`: System admin credentials  
- `user_api_test.py`: Test user credentials

## 🚨 Before Deployment

**Always run the master test:**
```bash
python3 scripts/run_all_tests.py
```

Only deploy if you see:
```
✅ ALL SYSTEMS OPERATIONAL
🚀 Safe to deploy!
```

## 🔄 Integration with CI/CD

Add to your deployment pipeline:

```bash
# In your CI/CD script
python3 scripts/run_all_tests.py
if [ $? -ne 0 ]; then
    echo "API tests failed - aborting deployment"
    exit 1
fi
echo "API tests passed - proceeding with deployment"
```

## 📝 Adding New Tests

1. Create new test file: `{domain}_api_test.py`
2. Follow the existing pattern with TestResult dataclass
3. Add to `run_all_tests.py` test configurations
4. Update this README

## 🧪 Test Philosophy

- **Fast**: Tests run in under 2 minutes
- **Reliable**: Tests the most critical functionality
- **Actionable**: Clear pass/fail with specific error messages
- **Automated**: No manual intervention required
