package com.doctor.appointment.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public boolean sendOtpEmail(String toInfo, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toInfo);
        message.setSubject("Your OTP for MediCare Registration");
        message.setText(
                "Your One Time Password (OTP) for registration is: " + otp + "\n\nThis OTP is valid for 10 minutes.");

        try {
            mailSender.send(message);
            System.out.println("OTP Email sent to: " + toInfo);
            return true;
        } catch (Exception e) {
            System.err.println("Failed to send OTP email: " + e.getMessage());
            return false;
        }
    }

    public void sendWelcomeEmail(String toInfo, String name) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toInfo);
        message.setSubject("Welcome to MediCare!");
        message.setText("Dear " + name + ",\n\n"
                + "You have successfully registered with the Doctor Appointment Booking System.\n"
                + "You can now login and book appointments.\n\n" + "Best Regards,\nMediCare Team");

        try {
            mailSender.send(message);
            System.out.println("Welcome Email sent to: " + toInfo);
        } catch (Exception e) {
            System.err.println("Failed to send Welcome email: " + e.getMessage());
        }
    }

    public void sendSimpleEmail(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
            System.out.println("Email sent to: " + to);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }
}
