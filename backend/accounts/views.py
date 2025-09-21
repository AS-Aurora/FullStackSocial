from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view


@api_view(['GET'])
def hello(request):
    return JsonResponse({"message": "Hello, world!"})