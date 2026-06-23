import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Email settings
FROM_EMAIL = 'your_email@gmail.com'
PASSWORD = 'your_password'

def send_email(subject, body):
    msg = MIMEMultipart()
    msg['From'] = FROM_EMAIL
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(FROM_EMAIL, PASSWORD)
    text = msg.as_string()
    server.sendmail(FROM_EMAIL, 'recipient_email@example.com', text)
    server.quit()

# Example usage
send_email('Daily Newsletter', 'Hello, this is your daily newsletter.')