package com.doctor.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "blood_requests")
public class BloodRequest {

    @Id
    private String id;
    
    private String bloodGroupRequired;
    private int unitsRequired;
    private String urgency; // e.g. "HIGH", "CRITICAL"
    private String requestedDate;
    
    private String status; // "PENDING", "FULFILLED"

    public BloodRequest() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getBloodGroupRequired() { return bloodGroupRequired; }
    public void setBloodGroupRequired(String bloodGroupRequired) { this.bloodGroupRequired = bloodGroupRequired; }

    public int getUnitsRequired() { return unitsRequired; }
    public void setUnitsRequired(int unitsRequired) { this.unitsRequired = unitsRequired; }

    public String getUrgency() { return urgency; }
    public void setUrgency(String urgency) { this.urgency = urgency; }

    public String getRequestedDate() { return requestedDate; }
    public void setRequestedDate(String requestedDate) { this.requestedDate = requestedDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
