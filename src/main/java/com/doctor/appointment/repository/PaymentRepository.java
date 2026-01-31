package com.doctor.appointment.repository;

import com.doctor.appointment.model.Payment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PaymentRepository extends MongoRepository<Payment, String> {

    List<Payment> findByAppointmentId(String appointmentId);

    List<Payment> findByStatus(String status);
}
