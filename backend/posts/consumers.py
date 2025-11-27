import json
import jwt
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
from .models import Post, Comment

User = get_user_model()

class PostConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.post_id = self.scope['url_route']['kwargs']['post_id']
        self.room_group_name = f'post_{self.post_id}'
        self.user = None

        # print(f"WebSocket connection attempt for post: {self.post_id}")

        # Get token from cookies (your CustomJWTAuthentication uses 'jwt-auth' cookie)
        cookies = self.scope.get('cookies', {})
        token = cookies.get('jwt-auth')
        
        if token:
            # print(f"Token found in cookies: {token[:20]}...")
            
            try:
                # Decode JWT token
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                user_id = payload.get('user_id')
                # print(f"Decoded user_id: {user_id}")
                
                if user_id:
                    self.user = await self.get_user(user_id)
                    if self.user:
                        pass
                        # print(f"Authenticated user: {self.user.username}")
                    else:
                        pass
                        # print("User not found")
                else:
                    pass
                    # print("No user_id in token payload")
                    
            except jwt.ExpiredSignatureError:
                pass
                # print("JWT token expired")
            except jwt.InvalidTokenError as e:
                pass
                # print(f"Invalid JWT token: {e}")
            except Exception as e:
                pass
                # print(f"Error decoding token: {e}")
        else:
            pass
            # print("No token found in cookies")

        if not self.user:
            # print("Authentication failed, rejecting connection")
            await self.close(code=4001)  # Custom code for authentication failure
            return

        # Check if post exists
        post = await self.get_post(self.post_id)
        if not post:
            # print(f"Post {self.post_id} not found")
            await self.close(code=4002)  # Custom code for post not found
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        # print(f"WebSocket connection accepted for user: {self.user.username} on post: {self.post_id}")
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'WebSocket connection established successfully',
            'post_id': self.post_id,
            'user': self.user.username
        }))

    async def disconnect(self, close_code):
        # print(f"WebSocket disconnected with code: {close_code}")
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            action = text_data_json.get('action')
            # print(f"Received action: {action} from user: {self.user.username if self.user else 'Unknown'}")
            
            # Handle authentication message
            if action == 'authenticate':
                token = text_data_json.get('token')
                if token:
                    try:
                        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                        user_id = payload.get('user_id')
                        if user_id:
                            self.user = await self.get_user(user_id)
                            # print(f"User authenticated via message: {self.user.username}")
                            await self.send(text_data=json.dumps({
                                'type': 'authentication',
                                'status': 'success'
                            }))
                    except Exception as e:
                        # print(f"Authentication failed: {e}")
                        await self.send(text_data=json.dumps({
                            'type': 'authentication',
                            'status': 'failed',
                            'error': str(e)
                        }))
                return

            if not self.user:
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
                    
        except json.JSONDecodeError as e:
            pass
            # print(f"Error parsing JSON: {e}")
        except Exception as e:
            pass
            # print(f"Error in receive: {e}")

    async def handle_like(self):
        try:
            post = await self.get_post(self.post_id)
            user = self.user
            
            if post and user:
                liked = await self.toggle_like(post, user)
                like_count = await self.get_like_count(post)
                
                # print(f"User {user.username} {'liked' if liked else 'unliked'} post {post.id}")
                
                # Send message to room group
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
                
                # Send message to room group
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