"""
User Dashboard Module - Isolated Analytics & Reporting

This module provides comprehensive dashboard analytics for users
while being completely isolated from regular business operations.

Architecture:
- dashboard/models/   - Dashboard-specific data models and repository
- dashboard/services/ - Analytics computation and data processing  
- dashboard/routers/  - Dashboard-specific API endpoints

Design Principles:
- Complete isolation from core user business logic
- Read-only operations (no mutations)
- Optimized for analytics queries
- Independent caching and performance tuning
"""
