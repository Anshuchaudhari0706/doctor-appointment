package com.doctor.appointment.repository;

import com.doctor.appointment.model.MedicalReport;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MedicalReportRepository extends MongoRepository<MedicalReport, String> {
    List<MedicalReport> findByPatientEmail(String patientEmail);
}
