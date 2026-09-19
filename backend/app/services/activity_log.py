from app import models


def log_activity(db, actor, action: str, resource_type: str = None, resource_id=None, meta: dict = None):
    """Queues an audit_logs row on the given session — does NOT commit itself, so it
    lands in the same transaction as whatever action it's describing (atomic: the log
    entry only persists if the actual change does)."""
    entry = models.AuditLog(
        user_id=actor.id if actor else None,
        action=action[:255],
        resource_type=resource_type,
        resource_id=resource_id,
        meta=meta,
    )
    db.add(entry)
