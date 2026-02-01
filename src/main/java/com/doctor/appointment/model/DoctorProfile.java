package com.doctor.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "doctors")
public class DoctorProfile {
    @Id
    private String id;
    private String userId; // Link to User account
    private String name;
    private String specialization;
    private List<Availability> schedule = new ArrayList<>(); // Specific dates and times
    private int experienceYears;
    private double consultationFee;

    // New fields for Location and Contact
    private String phone;
    private String hospitalName;
    private String hospitalAddress;
    private double latitude;
    private double longitude;

    public DoctorProfile() {
    }

    public DoctorProfile(String userId, String name, String specialization) {
        this.userId = userId;
        this.name = name;
        this.specialization = specialization;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getSpecialization() {
        return specialization;
    }

    public List<Availability> getSchedule() {
        return schedule;
    }

    public int getExperienceYears() {
        return experienceYears;
    }

    public double getConsultationFee() {
        return consultationFee;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public void setSchedule(List<Availability> schedule) {
        this.schedule = schedule;
    }

    public void setExperienceYears(int experienceYears) {
        this.experienceYears = experienceYears;
    }

    public void setConsultationFee(double consultationFee) {
        this.consultationFee = consultationFee;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getHospitalName() {
        return hospitalName;
    }

    public void setHospitalName(String hospitalName) {
        this.hospitalName = hospitalName;
    }

    public String getHospitalAddress() {
        return hospitalAddress;
    }

    public void setHospitalAddress(String hospitalAddress) {
        this.hospitalAddress = hospitalAddress;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }
}
