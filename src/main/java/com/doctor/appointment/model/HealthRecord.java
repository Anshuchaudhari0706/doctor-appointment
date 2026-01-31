package com.doctor.appointment.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;


@Document(collection = "healthrecords")
public class HealthRecord {

    @Id
    private String id;

    private String patientId;
    private String description;
}
