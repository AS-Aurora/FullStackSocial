import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from .models import Post, Comment

User = get_user_model()

class PostConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.post_id = self.scope['url_route']['kwargs']['post_id']
        self.room_group_name = f'post_{self.post_id}'
        
        # Use user from middleware
        self.user = self.scope.get('user')

        if not self.user or isinstance(self.user, AnonymousUser):
            await self.close(code=4001)
            return

        post = await self.get_post(self.post_id)
        if not post:
            await self.close(code=4002)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket connection established successfully',
            'post_id': self.post_id,
            'user': self.user.username
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            action = text_data_json.get('action')
            
            if not self.user or isinstance(self.user, AnonymousUser):
                await self.send(text_data=json.dumps({
                    'error': 'Authentication required'
                }))
                return

            if action == 'like':
                await self.handle_like()
            elif action == 'comment':
                content = text_data_json.get('content')
                if content:
                    await self.handle_comment(content)
                    
        except json.JSONDecodeError:
            pass
        except Exception:
            pass

    async def handle_like(self):
        try:
            post = await self.get_post(self.post_id)
            user = self.user
            
            if post and user:
                liked = await self.toggle_like(post, user)
                like_count = await self.get_like_count(post)
                
                # print(f"User {user.username} {'liked' if liked else 'unliked'} post {post.id}")
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'like_update',
                        'user_id': str(user.id),
                        'username': user.username,
                        'liked': liked,
                        'like_count': like_count,
                    }
                )
        except Exception as e:
            pass
            # print(f"Error handling like: {e}")

    async def handle_comment(self, content):
        try:
            post = await self.get_post(self.post_id)
            user = self.user
            
            if post and user:
                comment = await self.create_comment(post, user, content)
                
                # print(f"User {user.username} commented on post {post.id}")
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'new_comment',
                        'comment': {
                            'id': str(comment.id),
                            'content': comment.content,
                            'author': {
                                'id': str(user.id),
                                'username': user.username,
                                'profile_picture': user.profile_picture.url if user.profile_picture else None,
                            },
                            'created_at': comment.created_at.isoformat(),
                        }
                    }
                )
        except Exception as e:
            pass
            # print(f"Error handling comment: {e}")

    async def like_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'like_update',
            'user_id': event['user_id'],
            'username': event['username'],
            'liked': event['liked'],
            'like_count': event['like_count'],
        }))

    async def new_comment(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_comment',
            'comment': event['comment'],
        }))

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_post(self, post_id):
        try:
            return Post.objects.get(id=post_id, is_active=True)
        except Post.DoesNotExist:
            return None

    @database_sync_to_async
    def toggle_like(self, post, user):
        if post.likes.filter(id=user.id).exists():
            post.likes.remove(user)
            return False
        else:
            post.likes.add(user)
            return True

    @database_sync_to_async
    def get_like_count(self, post):
        return post.likes.count()

    @database_sync_to_async
    def create_comment(self, post, user, content):
        return Comment.objects.create(
            post=post,
            author=user,
            content=content
        )