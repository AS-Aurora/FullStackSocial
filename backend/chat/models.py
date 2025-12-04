from django.db import models
from uuid import uuid4
from django.contrib.auth import get_user_model

User = get_user_model()

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    participant1 = models.ForeignKey(
        User, 
        related_name='conversations_as_participant1', 
        on_delete=models.CASCADE
    )
    participant2 = models.ForeignKey(
        User, 
        related_name='conversations_as_participant2', 
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['participant1', 'participant2']
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation between {self.participant1.username} and {self.participant2.username}"

    def get_other_participant(self, user):
        return self.participant2 if self.participant1 == user else self.participant1

    @classmethod
    def get_or_create_conversation(cls, user1, user2):
        if user1.id < user2.id:
            participant1, participant2 = user1, user2
        else:
            participant1, participant2 = user2, user1

        conversation, created = cls.objects.get_or_create(
            participant1=participant1,
            participant2=participant2
        )
        return conversation, created


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, 
        related_name='messages', 
        on_delete=models.CASCADE
    )
    sender = models.ForeignKey(
        User, 
        related_name='sent_messages', 
        on_delete=models.CASCADE
    )
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"