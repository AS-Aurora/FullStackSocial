import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):   
    async def connect(self):
        self.user = self.scope.get('user')
        
        if not self.user or isinstance(self.user, AnonymousUser):
            await self.close(code=4001)
            return
        
        self.notification_group = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(
            self.notification_group,
            self.channel_name
        )
        await self.accept()
        
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to notifications'
        }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group'):
            await self.channel_layer.group_discard(
                self.notification_group,
                self.channel_name
            )
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'mark_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    await self.mark_notification_read(notification_id)
                    
        except json.JSONDecodeError:
            pass
    
    async def send_notification(self, event):
        notification = event['notification']
        
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification
        }))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from notifications.models import Notification
        try:
            notification = Notification.objects.get(id=notification_id, recipient=self.user)
            notification.mark_as_read()
        except Notification.DoesNotExist:
            pass