from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
import json
from .models import Conversation, Message, Call

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
        
            await self.channel_layer.group_add(
                self.conversation_group_name, 
                self.channel_name
            )
            await self.accept()
        
            await self.channel_layer.group_send(
                self.conversation_group_name, 
                {
                    'type': 'user_status',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'status': 'online'
                }
            )
        except Exception:
            await self.close()
    
    async def disconnect(self, close_code):
        if hasattr(self, 'conversation_group_name'):            
            await self.channel_layer.group_send(
                self.conversation_group_name, 
                {
                    'type': 'user_status',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'status': 'offline'
                }
            )
            
            await self.channel_layer.group_discard(
                self.conversation_group_name, 
                self.channel_name
            )
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action', 'message')
            
            handlers = {
                'message': self.handle_message,
                'typing': self.handle_typing,
                'mark_read': self.handle_mark_read,
                'request_status': self.handle_status_request,
                # Call handlers
                'call_initiate': self.handle_call_initiate,
                'call_accept': self.handle_call_accept,
                'call_reject': self.handle_call_reject,
                'call_end': self.handle_call_end,
                # Webrtc signaling handlers
                'webrtc_offer': self.handle_webrtc_offer,
                'webrtc_answer': self.handle_webrtc_answer,
                'webrtc_ice_candidate': self.handle_webrtc_ice_candidate,
            }
            
            handler = handlers.get(action)
            if handler:
                await handler(data)
        except (json.JSONDecodeError, Exception):
            pass

# All handlers below  
# Chat handlers: 
    # - Status related
    async def handle_status_request(self, data):
        await self.channel_layer.group_send(
            self.conversation_group_name, 
            {'type': 'status_request_broadcast'}
        )
    
    async def status_request_broadcast(self, event):
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'user_status',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'status': 'online'
            }
        )
    # - Message related
    async def handle_message(self, data):
        message_content = data.get('message', '').strip()
        if not message_content or isinstance(self.scope['user'], AnonymousUser):
            return
        
        message = await self.create_message(
            self.conversation, 
            self.user, 
            message_content
        )
        
        await self.channel_layer.group_send(
            self.conversation_group_name, 
            {
                'type': 'chat_message',
                'message_id': str(message.id),
                'message': message_content,
                'sender_id': str(self.user.id),
                'sender_username': self.user.username,
                'sender_profile_picture': self.user.profile_picture.url if self.user.profile_picture else None,
                'timestamp': message.created_at.isoformat(),
                'is_read': message.is_read
            }
        )
    # - Typing handler related
    async def handle_typing(self, data):
        await self.channel_layer.group_send(
            self.conversation_group_name, 
            {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_typing': data.get('is_typing', False)
            }
        )
    
    # - Read status related
    async def handle_mark_read(self, data):
        message_ids = data.get('message_ids', [])
        if message_ids:
            await self.mark_messages_as_read(message_ids, self.user)
            await self.channel_layer.group_send(
                self.conversation_group_name, 
                {
                    'type': 'messages_read',
                    'message_ids': message_ids,
                    'reader_id': str(self.user.id)
                }
            )
# Call handlers
    # - Initiate call
    async def handle_call_initiate(self, data):
        call_type = data.get('call_type', 'video')  # 'video' or 'audio'
        
        other_participant = await self.get_other_participant(
            self.conversation, 
            self.user
        )
        
        call = await self.create_call(
            self.conversation,
            self.user,
            other_participant,
            call_type
        )
        
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'call_incoming',
                'call_id': str(call.id),
                'call_type': call_type,
                'caller_id': str(self.user.id),
                'caller_username': self.user.username,
                'caller_profile_picture': self.user.profile_picture.url if self.user.profile_picture else None,
            }
        )
    # - Accept call
    async def handle_call_accept(self, data):
        call_id = data.get('call_id')
        
        if call_id:
            await self.update_call_status(call_id, 'accepted')
            
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    'type': 'call_accepted',
                    'call_id': call_id,
                    'acceptor_id': str(self.user.id),
                    'acceptor_username': self.user.username,
                }
            )
    
    # - Reject call
    async def handle_call_reject(self, data):
        call_id = data.get('call_id')
        
        if call_id:
            await self.update_call_status(call_id, 'rejected')
            
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    'type': 'call_rejected',
                    'call_id': call_id,
                    'rejector_id': str(self.user.id),
                }
            )
    
    # - End call
    async def handle_call_end(self, data):
        call_id = data.get('call_id')
        
        if call_id:
            await self.end_call(call_id)
            
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    'type': 'call_ended',
                    'call_id': call_id,
                    'ended_by': str(self.user.id),
                }
            )
    

# Signaling handlers
    # - Offer    
    async def handle_webrtc_offer(self, data):
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'webrtc_offer_forward',
                'offer': data.get('offer'),
                'sender_id': str(self.user.id),
            }
        )
    
    # - Answer
    async def handle_webrtc_answer(self, data):
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'webrtc_answer_forward',
                'answer': data.get('answer'),
                'sender_id': str(self.user.id),
            }
        )
    
    # - ICE Candidate
    async def handle_webrtc_ice_candidate(self, data):
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'webrtc_ice_candidate_forward',
                'candidate': data.get('candidate'),
                'sender_id': str(self.user.id),
            }
        )

# Message handlers
    # - Message forwards
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
    # - Status forwards
    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'username': event['username'],
            'status': event['status']
        }))
    
    # - Typing forwards
    async def typing_indicator(self, event):
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    # - Read status forwards
    async def messages_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'message_ids': event['message_ids'],
            'reader_id': event['reader_id']
        }))
    
# Call event forwards
    # - Incoming call
    async def call_incoming(self, event):
        if event['caller_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'call_incoming',
                'call_id': event['call_id'],
                'call_type': event['call_type'],
                'caller_id': event['caller_id'],
                'caller_username': event['caller_username'],
                'caller_profile_picture': event['caller_profile_picture'],
            }))
    
    # - Accept call
    async def call_accepted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_accepted',
            'call_id': event['call_id'],
            'acceptor_id': event['acceptor_id'],
            'acceptor_username': event['acceptor_username'],
        }))
    
    # - Reject call
    async def call_rejected(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_rejected',
            'call_id': event['call_id'],
            'rejector_id': event['rejector_id'],
        }))
    
    # - End call
    async def call_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_ended',
            'call_id': event['call_id'],
            'ended_by': event['ended_by'],
        }))
    
# Signaling forwards
    # - Offer forward
    async def webrtc_offer_forward(self, event):
        if event['sender_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'webrtc_offer',
                'offer': event['offer'],
                'sender_id': event['sender_id'],
            }))
    
    # - Answer forward
    async def webrtc_answer_forward(self, event):
        if event['sender_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'webrtc_answer',
                'answer': event['answer'],
                'sender_id': event['sender_id'],
            }))
    
    # - ICE forward
    async def webrtc_ice_candidate_forward(self, event):
        if event['sender_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'webrtc_ice_candidate',
                'candidate': event['candidate'],
                'sender_id': event['sender_id'],
            }))
    

# Database formation methods
    @database_sync_to_async
    def get_conversation(self, conversation_id):
        return Conversation.objects.get(id=conversation_id)
    
    @database_sync_to_async
    def is_participant(self, conversation, user):
        return conversation.participant1 == user or conversation.participant2 == user
    
    @database_sync_to_async
    def get_other_participant(self, conversation, user):
        return conversation.get_other_participant(user)
    
    @database_sync_to_async
    def create_message(self, conversation, sender, content):
        return Message.objects.create(
            conversation=conversation, 
            sender=sender, 
            content=content
        )
    
    @database_sync_to_async
    def mark_messages_as_read(self, message_ids, user):
        Message.objects.filter(
            id__in=message_ids,
            conversation=self.conversation
        ).exclude(sender=user).update(is_read=True)
    
    @database_sync_to_async
    def create_call(self, conversation, caller, receiver, call_type):
        return Call.objects.create(
            conversation=conversation,
            caller=caller,
            receiver=receiver,
            call_type=call_type,
            status='initiated'
        )
    
    @database_sync_to_async
    def update_call_status(self, call_id, status):
        call = Call.objects.get(id=call_id)
        call.status = status
        if status == 'accepted':
            call.answered_at = timezone.now()
        call.save()
        return call
    
    @database_sync_to_async
    def end_call(self, call_id):
        call = Call.objects.get(id=call_id)
        call.status = 'ended'
        call.ended_at = timezone.now()
        call.calculate_duration()
        call.save()
        return call