"""
Test Fixtures for API Testing
Provides HTTP clients and authentication helpers
"""
import pytest
import httpx
import os
from typing import AsyncGenerator
from dotenv import load_dotenv

# Load test environment variables
load_dotenv(".env.test")

# Base URL for test backend
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001")

# Test user credentials (from schema_dump.sql or .env.test)
TEST_USER_EMAIL = os.getenv("TEST_USER_EMAIL", "test@test.com")
TEST_USER_PASSWORD = os.getenv("TEST_USER_PASSWORD", "password123")


@pytest.fixture(scope="session")
def base_url():
    """Base URL for API tests"""
    return BASE_URL


@pytest.fixture
async def http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """
    Async HTTP client for making API requests
    Usage: await http_client.get("/api/health")
    """
    async with httpx.AsyncClient(
        base_url=BASE_URL,
        timeout=200.0,  # 3+ minutes for LLM analysis calls
        follow_redirects=True
    ) as client:
        yield client


@pytest.fixture
async def auth_token(http_client: httpx.AsyncClient) -> str:
    """
    Get authentication token for test user
    Attempts to login with TEST_USER_EMAIL and TEST_USER_PASSWORD
    
    Note: If login fails, this will raise an exception
    You may need to adjust credentials in .env.test
    """
    response = await http_client.post("/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    
    if response.status_code != 200:
        raise Exception(
            f"Failed to authenticate test user. "
            f"Status: {response.status_code}, "
            f"Response: {response.text}. "
            f"Check TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test"
        )
    
    data = response.json()
    
    # Handle different response formats
    if "access_token" in data:
        return data["access_token"]
    elif "data" in data and "access_token" in data["data"]:
        return data["data"]["access_token"]
    else:
        raise Exception(f"Could not find access_token in response: {data}")


@pytest.fixture
async def authenticated_client(http_client: httpx.AsyncClient, auth_token: str) -> httpx.AsyncClient:
    """
    HTTP client with authentication header set
    Usage: await authenticated_client.get("/api/users/me/profile")
    """
    http_client.headers["Authorization"] = f"Bearer {auth_token}"
    return http_client


@pytest.fixture
def test_user_credentials():
    """Test user credentials for signup/login tests"""
    return {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }


@pytest.fixture
def sample_session_data():
    """Sample data for creating a test session"""
    return {
        "level": "A1",
        "language_id": "687b9e32e94239d063f47070",  # German - from languages table
        "session_type": "practice",
        "template_id": "6876c221cbe142a4c3f53b36",  # Writing Practice Session (A1)
        "activity_type": "writing"  # Optional but good to include
    }

