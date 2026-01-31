package com.doctor.appointment.repository;

import com.doctor.appointment.model.Appointment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    List<Appointment> findByPatientId(String patientId); // patient email

    List<Appointment> findByDoctorId(String doctorId); // doctor email or ID

    List<Appointment> findByDoctorEmail(String doctorEmail);

    List<Appointment> findByDoctorIdAndDateAndTime(String doctorId, String date, String time);
}
