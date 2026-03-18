package com.doctor.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "beds")
public class Bed {

    @Id
    private String id;
    
    private String wardName;     // e.g. "ICU", "General Ward A"
    private int bedNumber;       // e.g. 101, 102
    private String status;       // "AVAILABLE", "OCCUPIED"
    
    // Details of assigned patient
    private String patientEmail; 
    private String patientName;
    private String admissionDate;

    public Bed() {}

    public Bed(String wardName, int bedNumber, String status) {
        this.wardName = wardName;
        this.bedNumber = bedNumber;
        this.status = status;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWardName() { return wardName; }
    public void setWardName(String wardName) { this.wardName = wardName; }

    public int getBedNumber() { return bedNumber; }
    public void setBedNumber(int bedNumber) { this.bedNumber = bedNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPatientEmail() { return patientEmail; }
    public void setPatientEmail(String patientEmail) { this.patientEmail = patientEmail; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getAdmissionDate() { return admissionDate; }
    public void setAdmissionDate(String admissionDate) { this.admissionDate = admissionDate; }
}
