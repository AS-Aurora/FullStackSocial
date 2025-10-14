# backend/posts/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Post, Comment

User = get_user_model()

class PostConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.post_id = self.scope['url_route']['kwargs']['post_id']
        self.post_group_name = f'post_{self.post_id}'

        # Reject connection if user is anonymous
        if self.scope["user"].is_anonymous:
            await self.close()
            return

        # Add this connection to the group
        await self.channel_layer.group_add(self.post_group_name, self.channel_name)
        await self.accept()

        # Send initial comments & likes
        await self.send_initial_data()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.post_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action_type = data.get("type")

        if action_type == "comment":
            content = data.get("content")
            if content:
                await self.create_comment(content)
        elif action_type == "like":
            await self.toggle_like(like=True)
        elif action_type == "unlike":
            await self.toggle_like(like=False)

    async def send_initial_data(self):
        post = await database_sync_to_async(Post.objects.get)(id=self.post_id)
        comments = await database_sync_to_async(lambda: list(post.comments.filter(is_active=True).values(
            'id', 'author__id', 'author__username', 'author__profile_picture', 'content', 'created_at'
        )))()

        await self.send(text_data=json.dumps({
            "type": "initial_data",
            "likes_count": post.like_count,
            "is_liked": await self.is_liked(),
            "comments": comments
        }))

    async def create_comment(self, content):
        user = self.scope["user"]

        # Save comment to DB
        post = await database_sync_to_async(Post.objects.get)(id=self.post_id)
        comment = await database_sync_to_async(Comment.objects.create)(
            post=post,
            author=user,
            content=content
        )

        # Serialize comment
        comment_data = {
            "id": str(comment.id),
            "author": {
                "id": str(user.id),
                "username": user.username,
                "profile_picture": user.profile_picture.url if user.profile_picture else None
            },
            "content": comment.content,
            "created_at": comment.created_at.isoformat()
        }

        # Broadcast to all in group
        await self.channel_layer.group_send(
            self.post_group_name,
            {
                "type": "broadcast_comment",
                "comment": comment_data,
                "comment_count": post.comment_count
            }
        )

    async def toggle_like(self, like=True):
        user = self.scope["user"]
        post = await database_sync_to_async(Post.objects.get)(id=self.post_id)

        # Update DB
        if like:
            await database_sync_to_async(post.likes.add)(user)
        else:
            await database_sync_to_async(post.likes.remove)(user)

        # Broadcast updated like status
        await self.channel_layer.group_send(
            self.post_group_name,
            {
                "type": "broadcast_like",
                "likes_count": post.like_count,
                "user_id": str(user.id),
                "is_liked": like
            }
        )

    async def broadcast_comment(self, event):
        await self.send(text_data=json.dumps({
            "type": "comment",
            "comment": event["comment"],
            "comment_count": event["comment_count"]
        }))

    async def broadcast_like(self, event):
        await self.send(text_data=json.dumps({
            "type": "like",
            "likes_count": event["likes_count"],
            "user_id": event["user_id"],
            "is_liked": event["is_liked"]
        }))

    async def is_liked(self):
        post = await database_sync_to_async(Post.objects.get)(id=self.post_id)
        return await database_sync_to_async(lambda: post.likes.filter(id=self.scope["user"].id).exists())()
