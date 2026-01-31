package com.doctor.appointment.repository;

import com.doctor.appointment.model.DoctorProfile;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface DoctorRepository extends MongoRepository<DoctorProfile, String> {
   Optional<DoctorProfile> findByUserId(String userId);
}
