from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
import json
import asyncio
from .models import Conversation, Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.user = self.scope['user']
    
        if isinstance(self.user, AnonymousUser):
            return await self.close()
    
        try:
            conversation = await self.get_conversation(self.conversation_id)
            if not await self.is_participant(conversation, self.user):
                return await self.close()
        
            self.conversation = conversation
            self.conversation_group_name = f'chat_{self.conversation.id}'
        
            await self.channel_layer.group_add(self.conversation_group_name, self.channel_name)
            await self.accept()
        
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'user_status',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'status': 'online'
            })
        except Exception:
            await self.close()
    
    async def disconnect(self, close_code):
        if hasattr(self, 'conversation_group_name'):
            await asyncio.sleep(0.5)
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'user_status',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'status': 'offline'
            })
            await self.channel_layer.group_discard(self.conversation_group_name, self.channel_name)
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action', 'message')
            
            handlers = {
                'message': self.handle_message,
                'typing': self.handle_typing,
                'mark_read': self.handle_mark_read,
                'request_status': self.handle_status_request
            }
            
            handler = handlers.get(action)
            if handler:
                await handler(data)
        except (json.JSONDecodeError, Exception):
            pass

    async def handle_status_request(self, data):
        await self.channel_layer.group_send(self.conversation_group_name, {'type': 'status_request_broadcast'})
    
    async def status_request_broadcast(self, event):
        await self.channel_layer.group_send(self.conversation_group_name, {
            'type': 'user_status',
            'user_id': str(self.user.id),
            'username': self.user.username,
            'status': 'online'
        })
    
    async def handle_message(self, data):
        message_content = data.get('message', '').strip()
        if not message_content or isinstance(self.scope['user'], AnonymousUser):
            return
        
        message = await self.create_message(self.conversation, self.user, message_content)
        
        await self.channel_layer.group_send(self.conversation_group_name, {
            'type': 'chat_message',
            'message_id': str(message.id),
            'message': message_content,
            'sender_id': str(self.user.id),
            'sender_username': self.user.username,
            'sender_profile_picture': self.user.profile_picture.url if self.user.profile_picture else None,
            'timestamp': message.created_at.isoformat(),
            'is_read': message.is_read
        })
    
    async def handle_typing(self, data):
        await self.channel_layer.group_send(self.conversation_group_name, {
            'type': 'typing_indicator',
            'user_id': str(self.user.id),
            'username': self.user.username,
            'is_typing': data.get('is_typing', False)
        })
    
    async def handle_mark_read(self, data):
        message_ids = data.get('message_ids', [])
        if message_ids:
            await self.mark_messages_as_read(message_ids, self.user)
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'messages_read',
                'message_ids': message_ids,
                'reader_id': str(self.user.id)
            })
    
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message_id': event['message_id'],
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'sender_profile_picture': event['sender_profile_picture'],
            'timestamp': event['timestamp'],
            'is_read': event['is_read']
        }))
    
    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'username': event['username'],
            'status': event['status']
        }))
    
    async def typing_indicator(self, event):
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    async def messages_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'message_ids': event['message_ids'],
            'reader_id': event['reader_id']
        }))
        
    @database_sync_to_async
    def get_conversation(self, conversation_id):
        return Conversation.objects.get(id=conversation_id)
    
    @database_sync_to_async
    def is_participant(self, conversation, user):
        return conversation.participant1 == user or conversation.participant2 == user
    
    @database_sync_to_async
    def create_message(self, conversation, sender, content):
        return Message.objects.create(conversation=conversation, sender=sender, content=content)
    
    @database_sync_to_async
    def mark_messages_as_read(self, message_ids, user):
        Message.objects.filter(
            id__in=message_ids,
            conversation=self.conversation
        ).exclude(sender=user).update(is_read=True)