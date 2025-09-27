from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path("ws/posts/<str:post_id>/", consumers.PostConsumer.as_asgi()),
]