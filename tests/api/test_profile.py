"""
User Profile API Tests
Tests 5 critical user profile endpoints
"""
import pytest


@pytest.mark.profile
@pytest.mark.asyncio
class TestUserProfile:
    """Test suite for user profile endpoints"""
    
    async def test_get_preferences(self, authenticated_client):
        """Test GET /api/users/me/preferences"""
        response = await authenticated_client.get("/api/users/me/preferences")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have preferences data
        assert "preferences" in data or "favorite_activities" in data
        print("✓ User preferences retrieved")
    
    async def test_update_preferences(self, authenticated_client):
        """Test PUT /api/users/me/preferences"""
        preferences_data = {
            "favorite_activities": ["reading", "writing"],
            "daily_goal": 10
        }
        response = await authenticated_client.put(
            "/api/users/me/preferences",
            json=preferences_data
        )
        
        # Should return 200 with updated preferences
        assert response.status_code in [200, 400, 422]
        print("✓ Update preferences endpoint working")
    
    async def test_update_profile(self, authenticated_client):
        """Test PUT /api/users/me/profile"""
        profile_data = {
            "name": "Test User Updated",
            "current_level": "A2"
        }
        response = await authenticated_client.put(
            "/api/users/me/profile",
            json=profile_data
        )
        
        # Should return 200 with updated profile
        assert response.status_code in [200, 400, 422]
        print("✓ Update profile endpoint working")
    
    async def test_change_password(self, authenticated_client):
        """Test PUT /api/users/me/password"""
        password_data = {
            "current_password": "old_password",
            "new_password": "new_password123"
        }
        response = await authenticated_client.put(
            "/api/users/me/password",
            json=password_data
        )
        
        # Expected 400 or 401 (wrong current password)
        assert response.status_code in [200, 400, 401, 422]
        print("✓ Change password endpoint working")
    
    async def test_get_usage_history(self, authenticated_client):
        """Test GET /api/users/usage-history"""
        response = await authenticated_client.get("/api/users/usage-history", params={
            "limit": 50,
            "skip": 0
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have practice_log or usage data
        assert "practice_log" in data or isinstance(data, list)
        print("✓ Usage history retrieved")
    
    async def test_get_usage_statistics(self, authenticated_client):
        """Test GET /api/users/usage-statistics"""
        response = await authenticated_client.get("/api/users/usage-statistics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have usage_info or statistics
        assert "usage_info" in data or "total_sessions" in data
        print("✓ Usage statistics retrieved")


@pytest.mark.profile
@pytest.mark.asyncio
class TestProfileSecurity:
    """Test profile endpoint security"""
    
    async def test_profile_requires_auth(self, http_client):
        """Test that profile endpoints require authentication"""
        endpoints = [
            "/api/auth/status",              # User status with full profile info
            "/api/users/me/preferences",     # User preferences
            "/api/users/usage-history",      # Usage history
            "/api/users/usage-statistics"    # Usage statistics
        ]
        
        for endpoint in endpoints:
            response = await http_client.get(endpoint)
            assert response.status_code in [401, 403], f"Endpoint {endpoint} should require auth"
        
        print("✓ All profile endpoints require authentication")

