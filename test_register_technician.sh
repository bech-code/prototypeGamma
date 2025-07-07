#!/bin/bash
curl -X POST http://127.0.0.1:8000/users/register/ \
  -F "username=testuser1" \
  -F "email=testuser1@example.com" \
  -F "password=TestPassword123!" \
  -F "password2=TestPassword123!" \
  -F "user_type=technician" \
  -F "first_name=Test" \
  -F "last_name=User" \
  -F "specialty=plumber" \
  -F "years_experience=3" \
  -F "phone=1234567890" \
  -F "piece_identite=@test_piece_identite.pdf" \
  -F "certificat_residence=@test_certificat_residence.pdf" 