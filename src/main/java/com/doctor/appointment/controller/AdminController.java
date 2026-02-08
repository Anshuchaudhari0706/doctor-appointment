package com.doctor.appointment.controller;

import com.doctor.appointment.model.DoctorProfile;
import com.doctor.appointment.model.Patient;
import com.doctor.appointment.model.Appointment;
import com.doctor.appointment.model.User;
import com.doctor.appointment.repository.DoctorRepository;
import com.doctor.appointment.repository.PatientRepository;
import com.doctor.appointment.repository.AppointmentRepository;
import com.doctor.appointment.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    // --- DOCTORS ---

    @GetMapping("/doctors")
    public List<DoctorProfile> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @DeleteMapping("/doctors/{id}")
    public String deleteDoctor(@PathVariable String id) {
        // id is the DoctorProfile ID
        Optional<DoctorProfile> profileOpt = doctorRepository.findById(id);
        if (profileOpt.isPresent()) {
            DoctorProfile profile = profileOpt.get();
            // Delete the associated User account if it exists
            if (profile.getUserId() != null) {
                userRepository.deleteById(profile.getUserId());
            }
            // Delete the profile
            doctorRepository.deleteById(id);
            return "Doctor deleted successfully";
        }
        return "Doctor not found";
    }

    // --- PATIENTS ---

    @GetMapping("/patients")
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    @DeleteMapping("/patients/{id}")
    public String deletePatient(@PathVariable String id) {
        // id is the Patient ID
        Optional<Patient> patientOpt = patientRepository.findById(id);
        if (patientOpt.isPresent()) {
            Patient patient = patientOpt.get();
            // Delete the associated User account by email
            if (patient.getEmail() != null) {
                Optional<User> userOpt = userRepository.findByEmail(patient.getEmail());
                userOpt.ifPresent(user -> userRepository.deleteById(user.getId()));
            }
            // Delete the patient record
            patientRepository.deleteById(id);
            return "Patient deleted successfully";
        }
        return "Patient not found";
    }

    // --- APPOINTMENTS ---

    @GetMapping("/appointments")
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    @DeleteMapping("/appointments/{id}")
    public String deleteAppointment(@PathVariable String id) {
        appointmentRepository.deleteById(id);
        return "Appointment deleted successfully";
    }
}
