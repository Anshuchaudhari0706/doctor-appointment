package com.doctor.appointment.service;

import java.util.HashMap;
import java.util.Random;

import org.springframework.stereotype.Service;

@Service
public class OtpService {

    private HashMap<String, String> otpData = new HashMap<>();

    public String generateOtp(String email) {
        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        otpData.put(email, otp);
        return otp;
    }

    public boolean validateOtp(String email, String otp) {
        return otp.equals(otpData.get(email));
    }
}
