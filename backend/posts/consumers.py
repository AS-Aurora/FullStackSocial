import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class PostConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.post_id = self.scope["url_route"]["kwargs"]["post_id"]
        self.post_group_name = f"post_{self.post_id}"

        # Join post group
        await self.channel_layer.group_add(
            self.post_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave post group
        await self.channel_layer.group_discard(
            self.post_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            
            if message_type == "comment":
                await self.handle_comment(data)
            elif message_type == "like":
                await self.handle_like(data)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON data"
            }))

    async def handle_comment(self, data):
        # This would be called when a new comment is added
        user = self.scope["user"]

        if not user.is_authenticated:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Authentication required to comment"
            }))
            return
        comment_data = data.get("comment")
        if comment_data:
            comment = await self.save_comment(user, self.post_id, comment_data)
            # Send comment to post group
            await self.channel_layer.group_send(
                self.post_group_name,
                {
                    "type": "new_comment",
                    "comment": {
                        "id": comment.id,
                        "author": {
                            "id": user.id,
                            "username": user.username,
                            "profile_picture": user.profile_picture.url if user.profile_picture else None
                        },
                    }
                }
            )

    async def handle_like(self, data):
        user = self.scope["user"]

        if not user.is_authenticated:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Authentication required to like"
            }))
            return
        
        # This would be called when a post is liked/unliked
        like_data = data.get("liked", True)
        like_count = await self.toggle_like(user, self.post_id, like_data)
        # Send like update to post group
        await self.channel_layer.group_send(
            self.post_group_name,
                {
                "type": "like_update",
                "like_data": {"likes": like_count, "is_liked": like_data}
            }
        )

    @database_sync_to_async
    def save_comment(self, user, post_id, comment_data):
        # Import models inside the method
        from .models import Post, Comment
        
        post = Post.objects.get(id=post_id)
        return Comment.objects.create(user=user, post=post, content=comment_data.get("content", ""))
    
    @database_sync_to_async
    def toggle_like(self, user, post_id, like):
        # Import models inside the method
        from .models import Post
        
        post = Post.objects.get(id=post_id)
        if like:
            post.likes.add(user)
        else:
            post.likes.remove(user)
        return post.like_count

    # Receive new comment from post group
    async def new_comment(self, event):
        comment = event["comment"]

        # Send comment to WebSocket
        await self.send(text_data=json.dumps({
            "type": "new_comment",
            "comment": comment
        }))

    # Receive like update from post group
    async def like_update(self, event):
        like_data = event["like_data"]

        # Send like update to WebSocket
        await self.send(text_data=json.dumps({
            "type": "like_update",
            "like_data": like_data
        }))