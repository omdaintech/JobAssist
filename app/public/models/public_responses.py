"""
Public Response Models
Pydantic models for public API responses
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class StandardApiResponse(BaseModel):
    """Standard public API response format"""
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Contact form submitted successfully",
                "data": {"message_id": "507f1f77bcf86cd799439011"}
            }
        }
