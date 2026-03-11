package com.doctor.appointment.controller;

import com.doctor.appointment.model.Appointment;
import com.doctor.appointment.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin("*")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @PostMapping("/book")
    public Appointment bookAppointment(@RequestBody Appointment appointment) {
        List<Appointment> existing = appointmentRepository.findByDoctorIdAndDateAndTime(appointment.getDoctorId(),
                appointment.getDate(), appointment.getTime());

        for (Appointment apt : existing) {
            if (!"CANCELLED".equalsIgnoreCase(apt.getStatus())) {
                throw new RuntimeException("This slot is already booked! Please choose another time.");
            }
        }

        appointment.setStatus("PENDING");
        return appointmentRepository.save(appointment);
    }

    @GetMapping("/patient/{patientId}")
    public List<Appointment> getPatientAppointments(@PathVariable String patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    @GetMapping("/doctor/{doctorId}")
    public List<Appointment> getDoctorAppointments(@PathVariable String doctorId) {
        if (doctorId.contains("@")) {
            return appointmentRepository.findByDoctorEmail(doctorId);
        }
        return appointmentRepository.findByDoctorId(doctorId);
    }

    // Cancel / Confirm
    @PutMapping("/{id}/status")
    public Appointment updateStatus(@PathVariable String id, @RequestParam String status) {
        Appointment apt = appointmentRepository.findById(id).orElseThrow();
        apt.setStatus(status);
        return appointmentRepository.save(apt);
    }

    @PutMapping("/{id}/pay")
    public Appointment payAppointment(@PathVariable String id, @RequestParam String paymentMode) {
        Appointment apt = appointmentRepository.findById(id).orElseThrow();
        if (!"ACCEPTED".equals(apt.getStatus())) {
            throw new RuntimeException("Appointment is not in accepted state, cannot pay.");
        }
        apt.setStatus("CONFIRMED");
        apt.setPaymentMode(paymentMode);
        return appointmentRepository.save(apt);
    }

    @PutMapping("/{id}/details")
    public Appointment updateDetails(@PathVariable String id, @RequestBody Appointment details) {
        Appointment apt = appointmentRepository.findById(id).orElseThrow();
        if (details.getMeetingLink() != null) apt.setMeetingLink(details.getMeetingLink());
        if (details.getPrescription() != null) apt.setPrescription(details.getPrescription());
        if (details.getRating() != null) apt.setRating(details.getRating());
        if (details.getReview() != null) apt.setReview(details.getReview());
        if (details.getStatus() != null) apt.setStatus(details.getStatus());
        return appointmentRepository.save(apt);
    }
}
