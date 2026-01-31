package com.doctor.appointment.controller;

import com.doctor.appointment.model.Patient;
import com.doctor.appointment.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin("*")
public class PatientController {

    @Autowired
    private PatientRepository patientRepository;

    @GetMapping("/{email}")
    public Patient getPatient(@PathVariable String email) {
        return patientRepository.findByEmail(email).orElse(null);
    }

    @PostMapping("/profile")
    public Patient updateProfile(@RequestBody Patient patient) {
        Optional<Patient> existing = patientRepository.findByEmail(patient.getEmail());
        if (existing.isPresent()) {
            Patient p = existing.get();
            p.setName(patient.getName());
            p.setPhone(patient.getPhone());
            p.setSex(patient.getSex());
            p.setAge(patient.getAge());
            p.setAddress(patient.getAddress());
            p.setDisease(patient.getDisease());
            return patientRepository.save(p);
        } else {
            return patientRepository.save(patient);
        }
    }
}
