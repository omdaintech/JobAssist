#!/usr/bin/env python3
"""
Test Report Generator with Standardized Naming
Generates HTML test reports with consistent naming: test_<type>_<date>.html
"""
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def get_timestamp():
    """Generate timestamp in format: DD-MMM-YYYY-HH:MM"""
    return datetime.now().strftime("%d-%b-%Y-%H:%M").lower()


def run_tests_with_report(test_path: str, report_name: str):
    """Run pytest with HTML report generation"""
    timestamp = get_timestamp()
    report_file = f"tests/result/test_{report_name}_{timestamp}.html"
    
    print(f"\n{'='*60}")
    print(f"Running: {report_name.upper()} Tests")
    print(f"Report: {report_file}")
    print(f"{'='*60}\n")
    
    cmd = [
        "pytest",
        test_path,
        "-v",
        f"--html={report_file}",
        "--self-contained-html",
        "--tb=short"
    ]
    
    result = subprocess.run(cmd)
    
    print(f"\n{'='*60}")
    print(f"Report generated: {report_file}")
    print(f"{'='*60}\n")
    
    return result.returncode


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python3 generate_test_reports.py <test_type>")
        print("\nAvailable test types:")
        print("  all              - All tests (tests/api/)")
        print("  credit_workflow  - Credit deduction test (CRITICAL)")
        print("  sessions         - Session tests + workflow")
        print("  auth             - Authentication tests")
        print("  payments         - Payment tests")
        print("  profile          - Profile tests")
        print("  workflows        - Both E2E workflows (session + credit)")
        print("\nExamples:")
        print("  python3 generate_test_reports.py all")
        print("  python3 generate_test_reports.py credit_workflow")
        print("  python3 generate_test_reports.py workflows")
        sys.exit(1)
    
    test_type = sys.argv[1].lower()
    
    # Create result directory if it doesn't exist
    Path("tests/result").mkdir(parents=True, exist_ok=True)
    
    # Map test types to paths and report names
    test_configs = {
        "all": ("tests/api/", "all"),
        "credit_workflow": ("tests/api/test_credit_workflow.py", "credit_workflow"),
        "sessions": ("tests/api/test_sessions.py", "sessions"),
        "auth": ("tests/api/test_auth.py", "auth"),
        "payments": ("tests/api/test_payments.py", "payments"),
        "profile": ("tests/api/test_profile.py", "profile"),
        "workflows": ("tests/api/test_sessions.py::TestSessionWorkflow tests/api/test_credit_workflow.py::TestCreditWorkflow", "workflows"),
    }
    
    if test_type not in test_configs:
        print(f"Error: Unknown test type '{test_type}'")
        print(f"Available types: {', '.join(test_configs.keys())}")
        sys.exit(1)
    
    test_path, report_name = test_configs[test_type]
    return run_tests_with_report(test_path, report_name)


if __name__ == "__main__":
    sys.exit(main())

