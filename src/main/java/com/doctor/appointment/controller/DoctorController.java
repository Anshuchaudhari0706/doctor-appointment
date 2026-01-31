package com.doctor.appointment.controller;

import com.doctor.appointment.model.DoctorProfile;
import com.doctor.appointment.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@CrossOrigin("*")
public class DoctorController {

    @Autowired
    private DoctorRepository doctorRepository;

    @GetMapping
    public List<DoctorProfile> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @PostMapping("/profile")
    public DoctorProfile updateProfile(@RequestBody DoctorProfile profile) {
        // If profile exists for user, update it
        if (profile.getUserId() != null) {
            DoctorProfile existing = doctorRepository.findByUserId(profile.getUserId()).orElse(null);
            if (existing != null) {
                profile.setId(existing.getId());
            }
        }
        return doctorRepository.save(profile);
    }

    @GetMapping("/profile/{userId}")
    public DoctorProfile getProfile(@PathVariable String userId) {
        return doctorRepository.findByUserId(userId).orElse(new DoctorProfile(userId, "", "General"));
    }
}
