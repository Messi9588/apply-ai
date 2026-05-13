from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:////app/data/apply_ai.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Resume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True)
    filename = Column(String)
    raw_text = Column(Text)
    parsed_json = Column(Text)  # JSON string of structured profile
    created_at = Column(DateTime, default=datetime.utcnow)


class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True)
    title = Column(String)
    organization = Column(String)
    location = Column(String)
    listing_type = Column(String)  # job | scholarship
    description = Column(Text)
    requirements = Column(Text)
    url = Column(String)
    deadline = Column(String)
    amount = Column(String)       # for scholarships
    salary = Column(String)       # for jobs
    source = Column(String)       # adzuna | builtin | manual
    external_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer)
    listing_title = Column(String)
    listing_org = Column(String)
    listing_url = Column(String)
    listing_type = Column(String)
    cover_letter = Column(Text)
    status = Column(String, default="saved")  # saved | applied | interview | rejected | accepted
    notes = Column(Text, default="")
    applied_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
