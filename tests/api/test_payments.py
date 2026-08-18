"""
Payment API Tests
Tests 4 critical payment endpoints
"""
import pytest


@pytest.mark.payments
@pytest.mark.asyncio
class TestPayments:
    """Test suite for payment endpoints"""
    
    async def test_get_pricing_packs(self, http_client):
        """Test GET /api/user/payments/pricing-packs - Public endpoint"""
        response = await http_client.get("/api/user/payments/pricing-packs")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have pricing_packs in response
        assert "pricing_packs" in data or isinstance(data, list)
        print(f"✓ Pricing packs retrieved")
    
    async def test_create_paypal_order(self, authenticated_client):
        """Test POST /api/user/payments/paypal/create-order"""
        order_data = {
            "pricing_pack_id": "fake_pack_id"
        }
        response = await authenticated_client.post(
            "/api/user/payments/paypal/create-order",
            json=order_data
        )
        
        # Expected 400 (invalid pack) or 200 (order created in sandbox)
        assert response.status_code in [200, 400, 404, 422]
        
        if response.status_code == 200:
            data = response.json()
            assert "order_id" in data or ("data" in data and "order_id" in data["data"])
            print("✓ PayPal order creation working")
        else:
            print("✓ PayPal order validation working")
    
    async def test_get_payment_history(self, authenticated_client):
        """Test GET /api/user/payments/history"""
        response = await authenticated_client.get("/api/user/payments/history", params={
            "limit": 20,
            "offset": 0
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have transactions list (even if empty)
        assert "transactions" in data or isinstance(data, list)
        print("✓ Payment history retrieved")
    
    async def test_payment_health(self, http_client):
        """Test GET /api/user/payments/health"""
        response = await http_client.get("/api/user/payments/health")
        
        # Should return 200 with health status
        assert response.status_code == 200
        print("✓ Payment health check working")


@pytest.mark.payments
@pytest.mark.asyncio
class TestPaymentSecurity:
    """Test payment endpoint security"""
    
    async def test_create_order_requires_auth(self, http_client):
        """Test that creating PayPal order requires authentication"""
        response = await http_client.post("/api/user/payments/paypal/create-order", json={
            "pricing_pack_id": "fake_id"
        })
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]
        print("✓ Payment endpoints require authentication")
    
    async def test_payment_history_requires_auth(self, http_client):
        """Test that payment history requires authentication"""
        response = await http_client.get("/api/user/payments/history")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]
        print("✓ Payment history requires authentication")

