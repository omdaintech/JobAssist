"""
MySQL Database Service for One-CEFR
Provides MySQL/SQLAlchemy database connectivity and operations
Version: 1.0.0
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager, asynccontextmanager
from typing import Dict, Any, Optional, List, Type, TypeVar, Generic, AsyncGenerator
import structlog
from app.config import settings
from app.common.models.mysql_models import Base
import asyncio
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import and_, or_, desc, asc, func
import uuid
from datetime import datetime
from urllib.parse import quote

logger = structlog.get_logger()

# Type variable for generic model operations
ModelType = TypeVar('ModelType', bound=Base)

class MySQLConnectionError(Exception):
    """Custom exception for MySQL connection issues"""
    pass

class MySQLOperationError(Exception):
    """Custom exception for MySQL operation issues"""
    pass

class MySQLService:
    """
    MySQL Database Service
    Provides both sync and async database operations
    """
    
    def __init__(self):
        self._engine = None
        self._async_engine = None
        self._SessionLocal = None
        self._AsyncSessionLocal = None
        self._initialized = False
        
    def initialize(self):
        """Initialize database connections and session factories"""
        if self._initialized:
            return
            
        try:
            # MySQL connection configuration - base config
            base_config = {
                'pool_size': getattr(settings, 'db_max_pool_size', 10),
                'max_overflow': 20,
                'pool_pre_ping': True,
                'pool_recycle': 3600,  # Recycle connections every hour
                'echo': getattr(settings, 'db_echo', False),
            }
            
            # Sync engine config (can use QueuePool)
            sync_config = {**base_config, 'poolclass': QueuePool}
            
            # Async engine config (no poolclass specified - let SQLAlchemy choose)
            async_config = base_config.copy()
            
            # Sync engine
            self._engine = create_engine(
                self._get_mysql_url(),
                **sync_config
            )
            
            # Async engine
            self._async_engine = create_async_engine(
                self._get_mysql_async_url(),
                **async_config
            )
            
            # Session factories
            self._SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,  # Keep instances usable after commit for downstream callers
                bind=self._engine
            )
            
            self._AsyncSessionLocal = async_sessionmaker(
                class_=AsyncSession,
                autocommit=False,
                autoflush=False,
                bind=self._async_engine,
                expire_on_commit=False
            )
            
            self._initialized = True
            logger.info("MySQL service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize MySQL service: {e}")
            raise MySQLConnectionError(f"Database initialization failed: {e}")
    
    def _get_mysql_url(self) -> str:
        """Get MySQL connection URL for sync operations"""
        host = getattr(settings, 'mysql_host', 'localhost')
        port = getattr(settings, 'mysql_port', 3306)
        user = getattr(settings, 'mysql_user', 'root')
        password = getattr(settings, 'mysql_password', '')
        database = getattr(settings, 'mysql_database', 'cefr_practice')
        
        # URL-encode the password to handle special characters like @
        encoded_password = quote(password)
        
        return f"mysql+mysqlconnector://{user}:{encoded_password}@{host}:{port}/{database}?charset=utf8mb4"
    
    def _get_mysql_async_url(self) -> str:
        """Get MySQL connection URL for async operations"""
        host = getattr(settings, 'mysql_host', 'localhost')
        port = getattr(settings, 'mysql_port', 3306)
        user = getattr(settings, 'mysql_user', 'root')
        password = getattr(settings, 'mysql_password', '')
        database = getattr(settings, 'mysql_database', 'cefr_practice')
        
        # URL-encode the password to handle special characters like @
        encoded_password = quote(password)
        
        return f"mysql+aiomysql://{user}:{encoded_password}@{host}:{port}/{database}?charset=utf8mb4"
    
    @property
    def engine(self):
        """Get sync engine"""
        if not self._initialized:
            self.initialize()
        return self._engine
    
    @property
    def async_engine(self):
        """Get async engine"""
        if not self._initialized:
            self.initialize()
        return self._async_engine
    
    @contextmanager
    def get_db(self) -> Session:
        """Get sync database session with automatic cleanup"""
        if not self._initialized:
            self.initialize()
            
        session = self._SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise MySQLOperationError(f"Database operation failed: {e}")
        finally:
            session.close()
    
    @asynccontextmanager
    async def get_async_db(self) -> AsyncGenerator[AsyncSession, None]:
        """Get async database session with automatic cleanup"""
        if not self._initialized:
            self.initialize()
            
        session = self._AsyncSessionLocal()
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Async database session error: {e}")
            raise MySQLOperationError(f"Async database operation failed: {e}")
        finally:
            await session.close()
    
    async def test_connection(self) -> bool:
        """Test database connectivity"""
        try:
            async with self.get_async_db() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def create_tables(self):
        """Create all tables (for development/testing)"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            raise MySQLOperationError(f"Table creation failed: {e}")
    
    def drop_tables(self):
        """Drop all tables (for development/testing)"""
        try:
            Base.metadata.drop_all(bind=self.engine)
            logger.info("Database tables dropped successfully")
        except Exception as e:
            logger.error(f"Failed to drop tables: {e}")
            raise MySQLOperationError(f"Table dropping failed: {e}")

class MySQLOperations(Generic[ModelType]):
    """
    Generic CRUD operations for MySQL models
    Provides common database operations with proper error handling
    """
    
    def __init__(self, model_class: Type[ModelType], mysql_service: MySQLService):
        self.model_class = model_class
        self.mysql_service = mysql_service
        self.logger = structlog.get_logger().bind(model=model_class.__name__)
    
    # ========================================
    # SYNC OPERATIONS
    # ========================================
    
    def create(self, **kwargs) -> ModelType:
        """Create a new record"""
        with self.mysql_service.get_db() as session:
            try:
                # Generate ID if not provided
                if 'id' not in kwargs and hasattr(self.model_class, 'id'):
                    kwargs['id'] = self._generate_id()
                
                instance = self.model_class(**kwargs)
                session.add(instance)
                session.flush()  # Get the ID without committing
                session.refresh(instance)  # Refresh to get all fields
                
                self.logger.info(f"Created {self.model_class.__name__}", id=instance.id)
                return instance
                
            except IntegrityError as e:
                self.logger.error(f"Integrity error creating {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Duplicate or invalid data: {e}")
            except Exception as e:
                self.logger.error(f"Error creating {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Create operation failed: {e}")
    
    def get_by_id(self, record_id: str) -> Optional[ModelType]:
        """Get record by ID"""
        with self.mysql_service.get_db() as session:
            try:
                return session.query(self.model_class).filter(self.model_class.id == record_id).first()
            except Exception as e:
                self.logger.error(f"Error getting {self.model_class.__name__} by ID: {e}")
                raise MySQLOperationError(f"Get by ID failed: {e}")
    
    def get_by_field(self, field_name: str, value: Any) -> Optional[ModelType]:
        """Get record by field value"""
        with self.mysql_service.get_db() as session:
            try:
                field = getattr(self.model_class, field_name)
                return session.query(self.model_class).filter(field == value).first()
            except Exception as e:
                self.logger.error(f"Error getting {self.model_class.__name__} by {field_name}: {e}")
                raise MySQLOperationError(f"Get by field failed: {e}")
    
    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[ModelType]:
        """Get all records with optional pagination"""
        with self.mysql_service.get_db() as session:
            try:
                query = session.query(self.model_class).offset(offset)
                if limit:
                    query = query.limit(limit)
                return query.all()
            except Exception as e:
                self.logger.error(f"Error getting all {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Get all failed: {e}")
    
    def update(self, record_id: str, **kwargs) -> Optional[ModelType]:
        """Update record by ID"""
        with self.mysql_service.get_db() as session:
            try:
                instance = session.query(self.model_class).filter(self.model_class.id == record_id).first()
                if not instance:
                    return None
                
                for key, value in kwargs.items():
                    if hasattr(instance, key):
                        setattr(instance, key, value)
                
                session.flush()
                session.refresh(instance)
                
                self.logger.info(f"Updated {self.model_class.__name__}", id=record_id)
                return instance
                
            except Exception as e:
                self.logger.error(f"Error updating {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Update operation failed: {e}")
    
    def delete(self, record_id: str) -> bool:
        """Delete record by ID"""
        with self.mysql_service.get_db() as session:
            try:
                instance = session.query(self.model_class).filter(self.model_class.id == record_id).first()
                if not instance:
                    return False
                
                session.delete(instance)
                self.logger.info(f"Deleted {self.model_class.__name__}", id=record_id)
                return True
                
            except Exception as e:
                self.logger.error(f"Error deleting {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Delete operation failed: {e}")
    
    def count(self, **filters) -> int:
        """Count records with optional filters"""
        with self.mysql_service.get_db() as session:
            try:
                query = session.query(self.model_class)
                for field_name, value in filters.items():
                    if hasattr(self.model_class, field_name):
                        field = getattr(self.model_class, field_name)
                        query = query.filter(field == value)
                return query.count()
            except Exception as e:
                self.logger.error(f"Error counting {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Count operation failed: {e}")
    
    def filter(self, limit: Optional[int] = None, offset: int = 0, order_by: Optional[str] = None, **filters) -> List[ModelType]:
        """Filter records with multiple conditions"""
        with self.mysql_service.get_db() as session:
            try:
                query = session.query(self.model_class)
                
                # Apply filters
                for field_name, value in filters.items():
                    if hasattr(self.model_class, field_name):
                        field = getattr(self.model_class, field_name)
                        if isinstance(value, list):
                            query = query.filter(field.in_(value))
                        else:
                            query = query.filter(field == value)
                
                # Apply ordering
                if order_by:
                    if order_by.startswith('-'):
                        field_name = order_by[1:]
                        if hasattr(self.model_class, field_name):
                            query = query.order_by(desc(getattr(self.model_class, field_name)))
                    else:
                        if hasattr(self.model_class, order_by):
                            query = query.order_by(asc(getattr(self.model_class, order_by)))
                
                # Apply pagination
                query = query.offset(offset)
                if limit:
                    query = query.limit(limit)
                
                return query.all()
                
            except Exception as e:
                self.logger.error(f"Error filtering {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Filter operation failed: {e}")
    
    # ========================================
    # ASYNC OPERATIONS
    # ========================================
    
    async def async_create(self, **kwargs) -> ModelType:
        """Async create a new record"""
        async with self.mysql_service.get_async_db() as session:
            try:
                # Generate ID if not provided
                if 'id' not in kwargs and hasattr(self.model_class, 'id'):
                    kwargs['id'] = self._generate_id()
                
                instance = self.model_class(**kwargs)
                session.add(instance)
                await session.flush()
                await session.refresh(instance)
                
                self.logger.info(f"Async created {self.model_class.__name__}", id=instance.id)
                return instance
                
            except IntegrityError as e:
                self.logger.error(f"Async integrity error creating {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Duplicate or invalid data: {e}")
            except Exception as e:
                self.logger.error(f"Async error creating {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Async create operation failed: {e}")
    
    async def async_get_by_id(self, record_id: str) -> Optional[ModelType]:
        """Async get record by ID"""
        async with self.mysql_service.get_async_db() as session:
            try:
                result = await session.execute(
                    text(f"SELECT * FROM {self.model_class.__tablename__} WHERE id = :id"),
                    {"id": record_id}
                )
                row = result.first()
                if row:
                    return self.model_class(**row._asdict())
                return None
            except Exception as e:
                self.logger.error(f"Async error getting {self.model_class.__name__} by ID: {e}")
                raise MySQLOperationError(f"Async get by ID failed: {e}")
    
    async def async_update(self, record_id: str, **kwargs) -> Optional[ModelType]:
        """Async update record by ID"""
        async with self.mysql_service.get_async_db() as session:
            try:
                # First get the record
                result = await session.execute(
                    text(f"SELECT * FROM {self.model_class.__tablename__} WHERE id = :id"),
                    {"id": record_id}
                )
                row = result.first()
                if not row:
                    return None
                
                instance = self.model_class(**row._asdict())
                
                # Update fields
                for key, value in kwargs.items():
                    if hasattr(instance, key):
                        setattr(instance, key, value)
                
                await session.merge(instance)
                await session.flush()
                
                self.logger.info(f"Async updated {self.model_class.__name__}", id=record_id)
                return instance
                
            except Exception as e:
                self.logger.error(f"Async error updating {self.model_class.__name__}: {e}")
                raise MySQLOperationError(f"Async update operation failed: {e}")
    
    def _generate_id(self) -> str:
        """Generate a unique ID for new records"""
        # Generate a 24-character hex string for unique IDs
        return uuid.uuid4().hex[:24]

# ========================================
# GLOBAL SERVICE INSTANCE
# ========================================

# Global MySQL service instance
mysql_service = MySQLService()

def get_mysql_service() -> MySQLService:
    """Get the global MySQL service instance"""
    return mysql_service

def get_db_session():
    """Dependency injection for FastAPI routes"""
    with mysql_service.get_db() as session:
        yield session

async def get_async_db_session():
    """Async dependency injection for FastAPI routes"""
    async with mysql_service.get_async_db() as session:
        yield session

# ========================================
# HEALTH CHECK FUNCTIONS
# ========================================

async def check_mysql_health() -> Dict[str, Any]:
    """Check MySQL database health"""
    try:
        service = get_mysql_service()
        is_connected = await service.test_connection()
        
        return {
            "status": "healthy" if is_connected else "unhealthy",
            "database": "mysql",
            "connection": "ok" if is_connected else "failed",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "mysql",
            "connection": "failed",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
