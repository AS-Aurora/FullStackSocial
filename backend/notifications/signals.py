from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from posts.models import Post, Comment
from accounts.models import Follow
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    if created:
        post_author = instance.post.author
        comment_author = instance.author
        notification = Notification.create_notification(
            recipient=post_author,
            sender=comment_author,
            notification_type='comment',
            post=instance.post,
            comment=instance
        )
        
        if notification:
            send_realtime_notification(notification)


@receiver(m2m_changed, sender=Post.likes.through)
def create_like_notification(sender, instance, action, pk_set, **kwargs):
    if action == 'post_add':
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        post = instance
        post_author = post.author
        
        for user_id in pk_set:
            try:
                liker = User.objects.get(pk=user_id)
                notification = Notification.create_notification(
                    recipient=post_author,
                    sender=liker,
                    notification_type='like',
                    post=post
                )
                
                if notification:
                    send_realtime_notification(notification)
                    
            except User.DoesNotExist:
                pass


@receiver(post_save, sender=Follow)
def create_follow_notification(sender, instance, created, **kwargs):
    if created:
        notification = Notification.create_notification(
            recipient=instance.following,
            sender=instance.follower,
            notification_type='follow'
        )
        
        if notification:
            send_realtime_notification(notification)


@receiver(post_save, sender=Post)
def create_new_post_notification(sender, instance, created, **kwargs):
    if created and instance.is_active:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        post_author = instance.author
        followers = Follow.objects.filter(following=post_author).select_related('follower')
        
        for follow in followers:
            notification = Notification.create_notification(
                recipient=follow.follower,
                sender=post_author,
                notification_type='post',
                post=instance
            )
            
            if notification:
                send_realtime_notification(notification)


def send_realtime_notification(notification):
    from notifications.serializers import NotificationSerializer
    
    channel_layer = get_channel_layer()
    serializer = NotificationSerializer(notification)
    async_to_sync(channel_layer.group_send)(
        f"notifications_{notification.recipient.id}",
        {
            'type': 'send_notification',
            'notification': serializer.data
        }
    )