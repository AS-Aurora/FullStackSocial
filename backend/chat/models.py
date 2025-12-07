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

class Call(models.Model):
    CALL_TYPE_CHOICES = [
        ('video', 'Video Call'),
        ('audio', 'Audio Call'),
    ]
    
    CALL_STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('ringing', 'Ringing'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('missed', 'Missed'),
        ('ended', 'Ended'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    conversation = models.ForeignKey('Conversation', related_name='calls', on_delete=models.CASCADE)
    caller = models.ForeignKey(User, related_name='calls_made', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='calls_received', on_delete=models.CASCADE)
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default='video')
    status = models.CharField(max_length=20, choices=CALL_STATUS_CHOICES, default='initiated')
    started_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0, help_text='Call duration in seconds')
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.call_type.title()} call from {self.caller.username} to {self.receiver.username}"
    
    def calculate_duration(self):
        if self.answered_at and self.ended_at:
            delta = self.ended_at - self.answered_at
            self.duration = int(delta.total_seconds())
            return self.duration
        return 0