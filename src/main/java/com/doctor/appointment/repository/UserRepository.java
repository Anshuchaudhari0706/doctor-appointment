package com.doctor.appointment.repository;

import com.doctor.appointment.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);

    java.util.List<User> findByRole(String role);

    java.util.List<User> findByRoleAndDoctorId(String role, String doctorId);
}
