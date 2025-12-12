from math import log
from django.utils import timezone
from typing import Set

def compute_post_score(post, user_following_ids: Set[int], now=None, w_freshness=1.0, w_like=2.0, w_comment=3.0, w_follow_boost=5.0):
    if now is None:
        now = timezone.now()

    age_hours = (now - post.created_at).total_seconds() / 3600.0
    freshness = w_freshness * (1.0 / (age_hours + 2.0))
    likes = 0
    comments = 0

    if hasattr(post, 'likes_count'):
        try:
            likes = int(getattr(post, 'likes_count') or 0)
        except Exception:
            likes = 0
    elif hasattr(post, 'like_count'):
        try:
            likes = int(getattr(post, 'like_count') or 0)
        except Exception:
            likes = 0

    if hasattr(post, 'comments_count'):
        try:
            comments = int(getattr(post, 'comments_count') or 0)
        except Exception:
            comments = 0
    elif hasattr(post, 'comment_count'):
        try:
            comments = int(getattr(post, 'comment_count') or 0)
        except Exception:
            comments = 0

    # engagement: log-scaled
    engagement = 0.0
    if likes > 0:
        engagement += w_like * log(likes + 1)
    if comments > 0:
        engagement += w_comment * log(comments + 1)

    follow_boost = w_follow_boost if post.author_id in user_following_ids else 0.0

    return freshness + engagement + follow_boost
