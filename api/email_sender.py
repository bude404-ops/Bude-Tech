import os
import smtplib
from email.message import EmailMessage

# Email configuration
EMAIL_ADDRESS = 'your_email@gmail.com'
EMAIL_PASSWORD = 'your_password'

def send_newsletter(subscribers):
    msg = EmailMessage()
    msg.set_content('Daily Newsletter')
    msg['Subject'] = 'Daily Newsletter'
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = subscribers

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        smtp.send_message(msg)

# Example usage
subscribers = ['subscriber1@example.com', 'subscriber2@example.com']
send_newsletter(subscribers)