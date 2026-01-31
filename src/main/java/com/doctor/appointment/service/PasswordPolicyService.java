package com.doctor.appointment.service;

import org.springframework.stereotype.Service;

@Service
public class PasswordPolicyService {

    public boolean isValidPassword(String password) {

        if (password.length() < 8) return false;

        boolean upper = password.matches(".*[A-Z].*");
        boolean lower = password.matches(".*[a-z].*");
        boolean digit = password.matches(".*[0-9].*");
        boolean special = password.matches(".*[@#$%^&+=].*");

        return upper && lower && digit && special;
    }
}
