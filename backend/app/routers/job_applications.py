from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.models import JobApplication
from app.schemas.schemas import JobApplicationCreate, JobApplicationOut
from app.services.email import send_job_application_email

router = APIRouter(prefix="/job-applications", tags=["job-applications"])


@router.post("", response_model=JobApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_job_application(
    body: JobApplicationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Public endpoint — anyone can submit a job application."""
    app = JobApplication(
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        area=body.area,
        message=body.message,
        cv_url=body.cv_url,
        offer_title=body.offer_title,
    )
    db.add(app)
    await db.flush()
    await db.refresh(app)

    # Send email notification to admin (best-effort, don't fail the request)
    send_job_application_email(
        applicant_name=body.full_name,
        applicant_email=body.email,
        applicant_phone=body.phone,
        area=body.area,
        offer_title=body.offer_title,
        message=body.message,
        cv_url=body.cv_url,
    )

    return app


@router.get("", response_model=list[JobApplicationOut])
async def list_job_applications(
    user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin-only — list all job applications."""
    result = await db.execute(
        select(JobApplication).order_by(JobApplication.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{application_id}", response_model=JobApplicationOut)
async def update_job_application(
    application_id: str,
    body: dict,
    user_id: Annotated[str, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin-only — update application status."""
    result = await db.execute(
        select(JobApplication).where(JobApplication.id == application_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Application not found")
    if "status" in body:
        app.status = body["status"]
    await db.flush()
    await db.refresh(app)
    return app
