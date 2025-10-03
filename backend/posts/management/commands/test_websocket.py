from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

class Command(BaseCommand):
    help = 'Test WebSocket connection and channel layers'

    def handle(self, *args, **options):
        self.stdout.write("Testing WebSocket setup...")
        
        try:
            # Test channel layer
            channel_layer = get_channel_layer()
            self.stdout.write(f"✓ Channel layer: {type(channel_layer).__name__}")
            
            # Test group send (basic functionality)
            async_to_sync(channel_layer.group_send)(
                "test_group",
                {
                    "type": "test.message",
                    "message": "Hello WebSocket!"
                }
            )
            self.stdout.write("✓ Group send functionality working")
            
            self.stdout.write(
                self.style.SUCCESS("WebSocket setup appears to be working correctly!")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"WebSocket setup error: {str(e)}")
            )
            self.stdout.write("Make sure Redis is running or check your CHANNEL_LAYERS configuration")