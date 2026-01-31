package com.doctor.appointment.repository;

import com.doctor.appointment.model.HealthRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface HealthRecordRepository extends MongoRepository<HealthRecord, String> {

    List<HealthRecord> findByPatientId(String patientId);
}
