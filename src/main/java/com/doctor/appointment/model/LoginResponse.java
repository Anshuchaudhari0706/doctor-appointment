package com.doctor.appointment.model;

public class LoginResponse {
    private String message;
    private String role;
    private String name;
    private String email;
    private boolean success;
    private String doctorId;

    public LoginResponse(String message, boolean success) {
        this.message = message;
        this.success = success;
    }

    public LoginResponse(String message, boolean success, String role, String name, String email) {
        this(message, success, role, name, email, null);
    }

    public LoginResponse(String message, boolean success, String role, String name, String email, String doctorId) {
        this.message = message;
        this.success = success;
        this.role = role;
        this.name = name;
        this.email = email;
        this.doctorId = doctorId;
    }

    public String getMessage() {
        return message;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getRole() {
        return role;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }
}
