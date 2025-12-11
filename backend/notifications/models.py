from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('like', 'Post Like'),
        ('comment', 'Post Comment'),
        ('follow', 'New Follower'),
        ('post', 'New Post from Following'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    post = models.ForeignKey('posts.Post', null=True, blank=True, on_delete=models.CASCADE)
    comment = models.ForeignKey('posts.Comment', null=True, blank=True, on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['-created_at'])
        ]

    def __str__(self):
            return f"Notification to {self.recipient.username} from {self.sender.username} - {self.notification_type}"
        
    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
        
    @staticmethod
    def create_notification(recipient, sender, notification_type, post=None, comment=None, message=""):
        if recipient == sender:
            return None  # Avoid sending notifications to self
            
        if notification_type not in dict(Notification.NOTIFICATION_TYPES):
            raise ValueError("Invalid notification type")
        elif notification_type == 'like':
            message = f"{sender.username} liked your post."
        elif notification_type == 'comment':
            message = f"{sender.username} commented on your post."
        elif notification_type == 'follow':
            message = f"{sender.username} started following you."
        elif notification_type == 'post':
            message = f"{sender.username} added a new post."

        notification = Notification.objects.create(
            recipient=recipient,
            sender=sender,
            notification_type=notification_type,
            post=post,
            comment=comment,
            message=message
        )
        notification.save()
        return notification