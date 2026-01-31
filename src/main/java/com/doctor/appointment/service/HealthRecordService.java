package com.doctor.appointment.service;

import com.doctor.appointment.model.HealthRecord;
import com.doctor.appointment.repository.HealthRecordRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class HealthRecordService {

    @Autowired
    private HealthRecordRepository repository;

    public List<HealthRecord> getByPatient(String patientId) {
        return repository.findByPatientId(patientId);
    }

    public HealthRecord save(HealthRecord record) {
        return repository.save(record);
    }
}
