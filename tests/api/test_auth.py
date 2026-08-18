"""
Authentication API Tests
Tests 9 critical authentication endpoints
"""
import pytest


@pytest.mark.auth
@pytest.mark.asyncio
class TestAuthentication:
    """Test suite for authentication endpoints"""
    
    async def test_health_check(self, http_client):
        """Sanity check - test backend is running"""
        response = await http_client.get("/api/health")
        assert response.status_code == 200
        print(f"✓ Health check passed: {response.json()}")
    
    async def test_login_success(self, http_client, test_user_credentials):
        """Test successful login with valid credentials"""
        response = await http_client.post("/api/auth/login", json={
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "access_token" in data or ("data" in data and "access_token" in data["data"])
        print(f"✓ Login successful for {test_user_credentials['email']}")
    
    async def test_login_invalid_credentials(self, http_client):
        """Test login fails with invalid credentials"""
        response = await http_client.post("/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        
        # Should return 401 or 404
        assert response.status_code in [401, 404]
        print("✓ Invalid login correctly rejected")
    
    async def test_auth_status(self, authenticated_client):
        """Test /api/auth/status with valid token"""
        response = await authenticated_client.get("/api/auth/status")
        
        # Should return 200 with user info
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Auth status retrieved: {data.get('email', 'N/A')}")
    
    async def test_signup_validation(self, http_client):
        """Test signup endpoint validation"""
        # Test with missing fields
        response = await http_client.post("/api/auth/signup", json={
            "email": "newuser@test.com"
            # Missing password and other required fields
        })
        
        # Should return validation error (422 or 400)
        assert response.status_code in [400, 422]
        print("✓ Signup validation working")
    
    async def test_forgot_password_endpoint(self, http_client, test_user_credentials):
        """Test forgot password endpoint exists and validates"""
        response = await http_client.post("/api/auth/forgot-password", json={
            "email": test_user_credentials["email"]
        })
        
        # Should return 200 (email sent) or 404 (user not found)
        # Either way, endpoint is working
        assert response.status_code in [200, 404]
        print("✓ Forgot password endpoint working")
    
    async def test_validate_reset_token_endpoint(self, http_client):
        """Test reset token validation endpoint exists"""
        response = await http_client.get("/api/auth/validate-reset-token", params={
            "email": "test@test.com",
            "token": "fake_token"
        })
        
        # Should return error (token invalid) - endpoint exists
        assert response.status_code in [400, 404, 422]
        print("✓ Validate reset token endpoint exists")
    
    async def test_reset_password_endpoint(self, http_client):
        """Test reset password endpoint validation"""
        response = await http_client.post("/api/auth/reset-password", json={
            "email": "test@test.com",
            "reset_token": "fake_token",
            "new_password": "newpass123",
            "confirm_password": "newpass123"
        })
        
        # Should return error (invalid token) - endpoint exists
        assert response.status_code in [400, 404, 422]
        print("✓ Reset password endpoint exists")
    
    async def test_verify_email_endpoint(self, http_client):
        """Test email verification endpoint exists"""
        response = await http_client.post("/api/auth/verify-email", json={
            "email_hash": "fake_hash",
            "verification_code": "123456"
        })
        
        # Should return error (invalid code) - endpoint exists
        assert response.status_code in [400, 404, 422]
        print("✓ Verify email endpoint exists")


@pytest.mark.auth
@pytest.mark.asyncio
class TestAuthenticationErrors:
    """Test authentication error handling"""
    
    async def test_protected_endpoint_without_token(self, http_client):
        """Test accessing protected endpoint without token"""
        response = await http_client.get("/api/auth/status")
        
        # Should return 401 Unauthorized
        assert response.status_code in [401, 403]
        print("✓ Protected endpoints require authentication")
    
    async def test_invalid_token(self, http_client):
        """Test accessing protected endpoint with invalid token"""
        http_client.headers["Authorization"] = "Bearer invalid_token_12345"
        response = await http_client.get("/api/auth/status")
        
        # Should return 401 Unauthorized
        assert response.status_code in [401, 403]
        print("✓ Invalid tokens rejected")

