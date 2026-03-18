package com.doctor.appointment.repository;

import com.doctor.appointment.model.Bed;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BedRepository extends MongoRepository<Bed, String> {
    List<Bed> findByStatus(String status);
    List<Bed> findByWardName(String wardName);
}
