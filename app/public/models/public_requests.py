"""
Public Request Models
Pydantic models for public API requests (contact form)
"""

"""
Public Request Models
Pydantic models for public API requests (contact form)
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
import re


class ContactFormRequest(BaseModel):
    """Contact form submission request"""
    name: str = Field(..., min_length=2, max_length=100, description="Contact name")
    email: str = Field(..., min_length=5, max_length=100, description="Contact email address")
    subject: str = Field(..., min_length=5, max_length=200, description="Message subject")
    message: str = Field(..., min_length=10, max_length=5000, description="Message content")
    captcha_token: str = Field(..., description="reCAPTCHA token for validation")

    @validator('email')
    def validate_email(cls, v):
        email = v.lower().strip()
        # Simple email validation
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError('Invalid email address')
        return email

    @validator('name', 'subject', 'message')
    def validate_text_fields(cls, v):
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "subject": "Question about German courses",
                "message": "I would like to know more about your German language courses...",
                "captcha_token": "03AGdBq27..."
            }
        }
