from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import time

class TaskScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()

    def add_interval_job(self, func, job_id: str, minutes: int = 60, args=None):
        """Add a job to run at regular intervals."""
        if args is None:
            args = []
            
        # Remove existing job if it exists
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
            
        self.scheduler.add_job(
            func,
            trigger=IntervalTrigger(minutes=minutes),
            id=job_id,
            name=job_id,
            args=args,
            replace_existing=True
        )
        print(f"Added interval job: {job_id} every {minutes} minutes.")

    def add_cron_job(self, func, job_id: str, hour: int, minute: int, args=None):
        """Add a job to run at a specific time each day."""
        if args is None:
            args = []
            
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
            
        self.scheduler.add_job(
            func,
            trigger=CronTrigger(hour=hour, minute=minute),
            id=job_id,
            name=job_id,
            args=args,
            replace_existing=True
        )
        print(f"Added cron job: {job_id} at {hour:02d}:{minute:02d} daily.")

    def get_jobs(self):
        """List all active jobs."""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run_time': str(job.next_run_time) if job.next_run_time else None
            })
        return jobs

    def remove_job(self, job_id: str):
        """Remove a job by ID."""
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
            return True
        return False

    def stop(self):
        """Shutdown the scheduler."""
        self.scheduler.shutdown()
