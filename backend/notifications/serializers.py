from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Notification

User = get_user_model()



class NotificationSenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'profile_picture']


class NotificationSerializer(serializers.ModelSerializer):
    sender = NotificationSenderSerializer(read_only=True)
    post_id = serializers.UUIDField(source='post.id', read_only=True, allow_null=True)
    comment_id = serializers.UUIDField(source='comment.id', read_only=True, allow_null=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'sender', 'notification_type', 'message', 'post_id', 'comment_id', 'is_read', 'created_at', 'read_at', 'time_ago']
        read_only_fields = ['id', 'created_at', 'read_at']
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "just now"
        elif diff < timedelta(hours=1):
            mins = int(diff.total_seconds() / 60)
            return f"{mins}m ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")